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
  });
}
