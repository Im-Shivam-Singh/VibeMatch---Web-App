import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { VibeUser } from "@/lib/types";

function serializeUser(u: any): VibeUser {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    city: u.city,
    instagram: u.instagram,
    vibes: u.vibes,
    hosted: u.hosted,
    rating: u.rating,
    ratingCount: u.ratingCount,
  };
}

// GET /api/threads?userId=... — list chat threads for a user, with last message + unread count
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const threads = await db.chatThread.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    orderBy: { updatedAt: "desc" },
  });

  const result = [];
  for (const t of threads) {
    const otherId = t.userAId === userId ? t.userBId : t.userAId;
    const otherUser = await db.user.findUnique({ where: { id: otherId } });
    const lastMessage = await db.message.findFirst({
      where: { threadId: t.id },
      orderBy: { createdAt: "desc" },
    });
    const unreadCount = await db.message.count({
      where: { threadId: t.id, receiverId: userId, read: false },
    });
    result.push({
      id: t.id,
      userAId: t.userAId,
      userBId: t.userBId,
      partyId: t.partyId,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      otherUser: otherUser ? serializeUser(otherUser) : undefined,
      lastMessage: lastMessage
        ? {
            ...lastMessage,
            createdAt: lastMessage.createdAt.toISOString(),
          }
        : undefined,
      unreadCount,
    });
  }

  return NextResponse.json({ threads: result });
}

// POST /api/threads — create or get a thread between two users (optionally tied to a party)
export async function POST(req: NextRequest) {
  let body: { userAId: string; userBId: string; partyId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { userAId, userBId, partyId } = body;
  if (!userAId || !userBId) {
    return NextResponse.json(
      { error: "userAId and userBId required" },
      { status: 400 },
    );
  }

  const existing = await db.chatThread.findFirst({
    where: {
      OR: [
        { userAId, userBId },
        { userAId: userBId, userBId: userAId },
      ],
    },
  });

  if (existing) {
    return NextResponse.json({ threadId: existing.id, created: false });
  }

  const t = await db.chatThread.create({
    data: { userAId, userBId, partyId: partyId || null },
  });
  return NextResponse.json({ threadId: t.id, created: true }, { status: 201 });
}
