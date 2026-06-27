import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/threads/[id]?userId=... — full thread with messages + other user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  const thread = await db.chatThread.findUnique({
    where: { id },
    include: {
      userA: true,
      userB: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // mark messages addressed to userId as read
  if (userId) {
    await db.message.updateMany({
      where: { threadId: id, receiverId: userId, read: false },
      data: { read: true },
    });
  }

  const otherId = userId
    ? thread.userAId === userId
      ? thread.userBId
      : thread.userAId
    : thread.userBId;
  const other = thread.userAId === otherId ? thread.userA : thread.userB;

  // ── Purchase-flow context ──────────────────────────────────────────
  // Look up the JoinRequest linked to this thread (if any). The chat UI uses
  // this to lock the composer until the host approves AND the guest pays —
  // "no other msg is allowed until payment is processed".
  let request: any = null;
  let paid = false;
  if (thread.partyId) {
    const req = await db.joinRequest.findFirst({
      where: { threadId: thread.id },
      orderBy: { createdAt: "desc" },
    });
    if (req) {
      request = {
        id: req.id,
        partyId: req.partyId,
        requesterId: req.requesterId,
        requesterName: req.requesterName,
        status: req.status,
        threadId: req.threadId,
        introVideoUrl: req.introVideoUrl,
        introVideoPoster: req.introVideoPoster,
        createdAt: req.createdAt.toISOString(),
        updatedAt: req.updatedAt.toISOString(),
      };
      // "Paid" = there's a paid Order for this party by the requesting guest.
      // That's the unlock signal — once true, the 1:1 chat opens for both sides.
      if (req.requesterId) {
        const paidOrder = await db.order.findFirst({
          where: {
            partyId: req.partyId,
            userId: req.requesterId,
            status: "paid",
          },
          select: { id: true },
        });
        paid = !!paidOrder;
      }
    }
  }

  return NextResponse.json({
    thread: {
      id: thread.id,
      userAId: thread.userAId,
      userBId: thread.userBId,
      partyId: thread.partyId,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
    },
    otherUser: other
      ? {
          id: other.id,
          name: other.name,
          username: other.username,
          bio: other.bio,
          avatarUrl: other.avatarUrl,
          city: other.city,
          instagram: other.instagram,
          vibePrefs: other.vibePrefs,
          vibes: other.vibes,
          hosted: other.hosted,
          rating: other.rating,
          ratingCount: other.ratingCount,
        }
      : null,
    messages: thread.messages.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
    // Purchase-flow context — drives the composer lock + status banner.
    request,
    paid,
  });
}
