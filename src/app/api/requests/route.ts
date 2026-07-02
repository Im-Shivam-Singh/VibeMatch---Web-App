import { NextRequest, NextResponse } from "next/server";
import { withDB } from "@/lib/mongodb";
import { Party, User, JoinRequest, ChatThread, Message } from "@/models";
import type { JoinRequestInput } from "@/lib/types";

// ── Purchase-flow rewrite ─────────────────────────────────────────────
// Guest clicks "Get your spot" on the detail screen → writes an intro +
// optional short intro video → we (1) ensure a 1:1 chat thread with the
// host, (2) create a pending JoinRequest linked to that thread + video,
// (3) drop the intro text + intro video into the thread so the host can
// vet them in the requests list, and (4) post a system message telling the
// guest approval is pending. The guest's spot is NOT reserved yet — the
// host must accept, after which a "Pay" CTA appears in the chat (WhatsApp-
// style). Payment (POST /api/orders) is what finally bumps guestCount.

// F4 — queue limit: cap pending applications at 2× capacity so a party
// can't be rushed by a wave of simultaneous applicants. Hosts process the
// pending queue; once it drains, more can apply.
function queueLimit(maxGuests: number) {
  return Math.max(2, maxGuests * 2);
}

// F5 — re-apply lockout: a guest who was rejected for a party can't apply
// again to the SAME party until it's over (party date + 1 day). Prevents
// spam-reapplying after a host says no.
function partyIsOver(date: string, time: string): boolean {
  try {
    const start = new Date(`${date}T${time || "00:00"}:00`);
    // "over" = 24h after the start (a party + its wind-down)
    return Date.now() > start.getTime() + 24 * 3_600_000;
  } catch {
    return false;
  }
}

async function _POST(req: NextRequest) {
  let body: JoinRequestInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    partyId,
    requesterName,
    introMessage,
    introVideoUrl,
    introVideoPoster,
    threadId: providedThreadId,
    requesterId: providedRequesterId,
  } = body;

  if (!partyId || !requesterName || !introMessage) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const party = await Party.findById(partyId).lean({ virtuals: true });
  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  // Look up host user
  const host = party.hostId ? await User.findById(party.hostId).lean({ virtuals: true }) : null;
  if (!host) {
    return NextResponse.json(
      { error: "This party has no host to message" },
      { status: 400 },
    );
  }

  // Resolve the requester user (prefer the explicitly-passed id, fall back
  // to a name lookup so older callers keep working).
  const requester = providedRequesterId
    ? await User.findById(providedRequesterId).lean({ virtuals: true })
    : await User.findOne({ name: requesterName }).lean({ virtuals: true });

  // ── F5: re-apply lockout ──────────────────────────────────────────
  if (requester) {
    const requesterId = requester.id ?? requester._id?.toString();
    const priorRejected = await JoinRequest.findOne({
      partyId,
      requesterId,
      status: "rejected",
    }).lean({ virtuals: true });
    if (priorRejected && !partyIsOver(party.date, party.time)) {
      return NextResponse.json(
        {
          error:
            "You were declined for this event. You can't re-apply until it's over.",
          code: "REAPPLY_LOCKED",
        },
        { status: 409 },
      );
    }
    // Also block duplicate pending applications (don't let the same guest
    // spam-apply while their first one is still pending).
    const priorPending = await JoinRequest.findOne({
      partyId,
      requesterId,
      status: "pending",
    }).lean({ virtuals: true });
    if (priorPending) {
      return NextResponse.json(
        {
          error: "You already have a pending request for this event.",
          code: "ALREADY_PENDING",
          threadId: priorPending.threadId,
        },
        { status: 409 },
      );
    }
  }

  // ── F4: queue limit ──────────────────────────────────────────────
  const pendingCount = await JoinRequest.countDocuments({ partyId, status: "pending" });
  const limit = queueLimit(party.maxGuests);
  if (pendingCount >= limit) {
    return NextResponse.json(
      {
        error:
          "This event's application queue is full right now. Try again later.",
        code: "QUEUE_FULL",
        queueLimit: limit,
      },
      { status: 429 },
    );
  }

  // ── Ensure the 1:1 host↔guest thread ─────────────────────────────
  let threadId = providedThreadId ?? null;
  const requesterId = requester?.id ?? requester?._id?.toString();
  const hostId = host.id ?? host._id?.toString();

  if (!threadId && requesterId) {
    const existing = await ChatThread.findOne({
      $or: [
        { userAId: requesterId, userBId: hostId },
        { userAId: hostId, userBId: requesterId },
      ],
    }).lean({ virtuals: true });
    threadId = existing?.id ?? existing?._id?.toString() ?? null;
    if (!threadId) {
      const t = await ChatThread.create({
        userAId: requesterId,
        userBId: hostId,
        partyId,
      });
      threadId = t.id ?? t._id?.toString();
    }
  }

  // ── Create the JoinRequest (linked to thread + intro video) ──────
  const request = await JoinRequest.create({
    partyId,
    requesterName,
    introMessage,
    requesterId: requesterId ?? null,
    threadId,
    introVideoUrl: introVideoUrl ?? null,
    introVideoPoster: introVideoPoster ?? null,
  });

  const requestId = request.id ?? request._id?.toString();

  // ── Drop the intro text + video + system notice into the thread ─
  if (requesterId && hostId && threadId) {
    // Intro text (from guest → host)
    await Message.create({
      threadId,
      senderId: requesterId,
      receiverId: hostId,
      content: introMessage,
      kind: "text",
    });
    // Intro video (if attached) — rendered as a tappable video message
    if (introVideoUrl) {
      await Message.create({
        threadId,
        senderId: requesterId,
        receiverId: hostId,
        content: "Intro video 🎬",
        kind: "video",
        mediaUrl: introVideoUrl,
        requestId,
      });
    }
    // System notice to the guest (so the chat explains the wait)
    await Message.create({
      threadId,
      senderId: hostId,
      receiverId: requesterId,
      content:
        "⏳ Waiting for host approval. You'll be notified here — payment unlocks once the host says yes.",
      kind: "system",
    });
    await ChatThread.findByIdAndUpdate(threadId, { $set: { updatedAt: new Date() } });
  }

  // NOTE: guestCount is intentionally NOT bumped here. The spot is only
  // reserved once the host accepts AND the guest pays (POST /api/orders).

  return NextResponse.json(
    {
      id: requestId,
      threadId,
      message: "Request sent! The host will review your intro and reply here.",
      status: request.status,
    },
    { status: 201 },
  );
}

// GET /api/requests?partyId=...  — list requests for a party (host view)
async function _GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const partyId = searchParams.get("partyId");
  if (!partyId) {
    return NextResponse.json({ error: "partyId required" }, { status: 400 });
  }

  const requests = await JoinRequest.find({ partyId })
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

  return NextResponse.json({
    requests: requests.map((r) => ({
      ...r,
      id: r.id ?? r._id?.toString(),
      createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt ?? ""),
      updatedAt: r.updatedAt?.toISOString?.() ?? String(r.updatedAt ?? ""),
    })),
  });
}

export const POST = withDB(_POST);
export const GET = withDB(_GET);
