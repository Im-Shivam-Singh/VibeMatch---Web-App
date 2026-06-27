import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { GroupChat } from "@/lib/types";

// GET /api/group-chats?partyId=...&userId=...
// Returns the group chat for a party (members + messages). 404 if the group
// chat hasn't been enabled yet (no paid guests) or the user isn't a member.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const partyId = searchParams.get("partyId");
  const userId = searchParams.get("userId");
  if (!partyId || !userId) {
    return NextResponse.json(
      { error: "partyId and userId are required" },
      { status: 400 },
    );
  }

  const gc = await db.groupChat.findUnique({
    where: { partyId },
    include: {
      members: { include: { user: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!gc) {
    return NextResponse.json(
      { error: "Group chat not unlocked yet", code: "NOT_ENABLED" },
      { status: 404 },
    );
  }
  // Membership gate: only paid guests + the host can read the group chat.
  const isMember = gc.members.some((m) => m.userId === userId);
  if (!isMember) {
    return NextResponse.json(
      { error: "You haven't unlocked this group chat yet", code: "NOT_MEMBER" },
      { status: 403 },
    );
  }

  const serialized: GroupChat = {
    id: gc.id,
    partyId: gc.partyId,
    members: gc.members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      joinedAt: m.joinedAt.toISOString(),
    })),
    messages: gc.messages.map((m) => ({
      id: m.id,
      groupChatId: m.groupChatId,
      senderId: m.senderId,
      content: m.content,
      kind: (m.kind as "text" | "system" | "offer") ?? "text",
      offerBrand: m.offerBrand ?? null,
      createdAt: m.createdAt.toISOString(),
      sender: {
        id: m.senderId,
        name: gc.members.find((mm) => mm.userId === m.senderId)?.user.name ?? "Guest",
        avatarUrl: gc.members.find((mm) => mm.userId === m.senderId)?.user.avatarUrl ?? null,
      },
    })),
  };
  return NextResponse.json({ groupChat: serialized });
}

// POST /api/group-chats  { groupChatId, senderId, content }
// Send a text message to the group chat.
export async function POST(req: NextRequest) {
  let body: { groupChatId: string; senderId: string; content: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { groupChatId, senderId, content } = body;
  if (!groupChatId || !senderId || !content?.trim()) {
    return NextResponse.json(
      { error: "groupChatId, senderId, content are required" },
      { status: 400 },
    );
  }
  // Membership gate
  const member = await db.groupChatMember.findUnique({
    where: { groupChatId_userId: { groupChatId, userId: senderId } },
  });
  if (!member) {
    return NextResponse.json(
      { error: "You're not a member of this group chat" },
      { status: 403 },
    );
  }
  const msg = await db.groupChatMessage.create({
    data: {
      groupChatId,
      senderId,
      content: content.trim(),
      kind: "text",
    },
  });
  await db.groupChat.update({
    where: { id: groupChatId },
    data: { updatedAt: new Date() },
  });
  return NextResponse.json(
    {
      message: {
        id: msg.id,
        groupChatId: msg.groupChatId,
        senderId: msg.senderId,
        content: msg.content,
        kind: "text",
        createdAt: msg.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
