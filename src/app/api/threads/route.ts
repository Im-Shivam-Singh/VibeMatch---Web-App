import { NextRequest, NextResponse } from "next/server";
import { withDB } from "@/lib/mongodb";
import { ChatThread, User, Message } from "@/models";
import type { VibeUser } from "@/lib/types";

function serializeUser(u: any): VibeUser {
  return {
    id: u.id ?? u._id?.toString(),
    name: u.name,
    username: u.username,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    city: u.city,
    instagram: u.instagram,
    vibePrefs: u.vibePrefs,
    profession: u.profession,
    role: u.role,
    vibes: u.vibes,
    hosted: u.hosted,
    rating: u.rating,
    ratingCount: u.ratingCount,
    trustScore: u.trustScore,
    trustCount: u.trustCount,
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
async function _GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const threads = await ChatThread.find({
    $or: [{ userAId: userId }, { userBId: userId }],
  })
    .sort({ updatedAt: -1 })
    .lean({ virtuals: true });

  const result: ThreadListItem[] = [];
  for (const t of threads) {
    const threadId = t.id ?? t._id?.toString();
    const otherId = t.userAId === userId ? t.userBId : t.userAId;
    let otherUser: any = null;
    try {
      otherUser = await User.findById(otherId).lean({ virtuals: true });
    } catch (err) {
      console.warn(`[threads] Other user lookup failed for thread ${threadId}:`, err);
    }
    const lastMessage = await Message.findOne({ threadId })
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });
    const unreadCount = await Message.countDocuments({
      threadId,
      receiverId: userId,
      read: false,
    });
    result.push({
      id: threadId,
      userAId: t.userAId,
      userBId: t.userBId,
      partyId: t.partyId,
      createdAt: t.createdAt?.toISOString?.() ?? String(t.createdAt ?? ""),
      updatedAt: t.updatedAt?.toISOString?.() ?? String(t.updatedAt ?? ""),
      otherUser: otherUser
        ? serializeUser(otherUser)
        : { id: otherId, name: "Unknown User", vibes: 0, hosted: 0, rating: 0, ratingCount: 0 } as any,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id ?? lastMessage._id?.toString(),
            threadId: lastMessage.threadId,
            senderId: lastMessage.senderId,
            receiverId: lastMessage.receiverId,
            content: lastMessage.content,
            read: lastMessage.read,
            createdAt: lastMessage.createdAt?.toISOString?.() ?? String(lastMessage.createdAt ?? ""),
          }
        : undefined,
      unreadCount,
    });
  }

  return NextResponse.json({ threads: result });
}

// POST /api/threads
async function _POST(req: NextRequest) {
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

  const existing = await ChatThread.findOne({
    $or: [
      { userAId, userBId },
      { userAId: userBId, userBId: userAId },
    ],
  }).lean({ virtuals: true });

  if (existing) {
    return NextResponse.json({ threadId: existing.id ?? existing._id?.toString(), created: false });
  }

  const t = await ChatThread.create({
    userAId,
    userBId,
    partyId: partyId || null,
  });
  return NextResponse.json({ threadId: t.id ?? t._id?.toString(), created: true }, { status: 201 });
}

export const GET = withDB(_GET);
export const POST = withDB(_POST);
