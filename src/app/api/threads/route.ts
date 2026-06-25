import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { VibeUser } from "@/lib/types";

function serializeUser(u: { id: string; name: string; username: string | null; bio: string | null; avatarUrl: string | null; city: string | null; instagram: string | null; vibePrefs: string; vibes: number; hosted: number; rating: number; ratingCount: number }): VibeUser {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    city: u.city,
    instagram: u.instagram,
    vibePrefs: u.vibePrefs,
    vibes: u.vibes,
    hosted: u.hosted,
    rating: u.rating,
    ratingCount: u.ratingCount,
  };
}

interface ThreadListItem {
  id: string;
  userAId: string;
  userBId: string;
  partyId: string | null;
  createdAt: string;
  updatedAt: string;
  otherUser: VibeUser | undefined;
  lastMessage: {
    id: string;
    threadId: string;
    senderId: string;
    receiverId: string;
    content: string;
    read: boolean;
    createdAt: string;
  } | undefined;
  unreadCount: number;
}

// GET /api/threads?userId=...
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

  const result: ThreadListItem[] = [];
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
            id: lastMessage.id,
            threadId: lastMessage.threadId,
            senderId: lastMessage.senderId,
            receiverId: lastMessage.receiverId,
            content: lastMessage.content,
            read: lastMessage.read,
            createdAt: lastMessage.createdAt.toISOString(),
          }
        : undefined,
      unreadCount,
    });
  }

  return NextResponse.json({ threads: result });
}

// POST /api/threads
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
