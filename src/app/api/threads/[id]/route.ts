import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ChatThread, User, Message, JoinRequest, Order } from "@/models";

// GET /api/threads/[id]?userId=... — full thread with messages + other user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  await connectDB();

  const thread = await ChatThread.findById(id).lean({ virtuals: true });
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // mark messages addressed to userId as read
  if (userId) {
    await Message.updateMany(
      { threadId: id, receiverId: userId, read: false },
      { $set: { read: true } },
    );
  }

  // Fetch userA and userB
  const [userA, userB, messages] = await Promise.all([
    User.findById(thread.userAId).lean({ virtuals: true }),
    User.findById(thread.userBId).lean({ virtuals: true }),
    Message.find({ threadId: id }).sort({ createdAt: 1 }).lean({ virtuals: true }),
  ]);

  const otherId = userId
    ? thread.userAId === userId
      ? thread.userBId
      : thread.userAId
    : thread.userBId;
  const other = thread.userAId === otherId ? userA : userB;

  // ── Purchase-flow context ──────────────────────────────────────────
  // Look up the JoinRequest linked to this thread (if any). The chat UI uses
  // this to lock the composer until the host approves AND the guest pays —
  // "no other msg is allowed until payment is processed".
  let request: any = null;
  let paid = false;
  if (thread.partyId) {
    const reqDoc = await JoinRequest.findOne({ threadId: id })
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });
    if (reqDoc) {
      request = {
        id: reqDoc.id ?? reqDoc._id?.toString(),
        partyId: reqDoc.partyId,
        requesterId: reqDoc.requesterId,
        requesterName: reqDoc.requesterName,
        status: reqDoc.status,
        threadId: reqDoc.threadId,
        introVideoUrl: reqDoc.introVideoUrl,
        introVideoPoster: reqDoc.introVideoPoster,
        createdAt: reqDoc.createdAt?.toISOString?.() ?? String(reqDoc.createdAt ?? ""),
        updatedAt: reqDoc.updatedAt?.toISOString?.() ?? String(reqDoc.updatedAt ?? ""),
      };
      // "Paid" = there's a paid Order for this party by the requesting guest.
      // That's the unlock signal — once true, the 1:1 chat opens for both sides.
      if (reqDoc.requesterId) {
        const paidOrder = await Order.findOne({
          partyId: reqDoc.partyId,
          userId: reqDoc.requesterId,
          status: "paid",
        }).lean({ virtuals: true });
        paid = !!paidOrder;
      }
    }
  }

  return NextResponse.json({
    thread: {
      id: thread.id ?? thread._id?.toString(),
      userAId: thread.userAId,
      userBId: thread.userBId,
      partyId: thread.partyId,
      createdAt: thread.createdAt?.toISOString?.() ?? String(thread.createdAt ?? ""),
      updatedAt: thread.updatedAt?.toISOString?.() ?? String(thread.updatedAt ?? ""),
    },
    otherUser: other
      ? {
          id: other.id ?? other._id?.toString(),
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
          trustScore: other.trustScore,
          trustCount: other.trustCount,
        }
      : null,
    messages: messages.map((m) => ({
      ...m,
      id: m.id ?? m._id?.toString(),
      createdAt: m.createdAt?.toISOString?.() ?? String(m.createdAt ?? ""),
    })),
    // Purchase-flow context — drives the composer lock + status banner.
    request,
    paid,
  });
}
