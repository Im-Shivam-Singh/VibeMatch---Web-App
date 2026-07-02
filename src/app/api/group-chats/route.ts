import { NextRequest, NextResponse } from "next/server";
import { withDB } from "@/lib/mongodb";
import { GroupChat, User } from "@/models";
import type { GroupChat as GroupChatType } from "@/lib/types";

// GET /api/group-chats?partyId=...&userId=...
// Returns the group chat for a party (members + messages). 404 if the group
// chat hasn't been enabled yet (no paid guests) or the user isn't a member.
async function _GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const partyId = searchParams.get("partyId");
  const userId = searchParams.get("userId");
  if (!partyId || !userId) {
    return NextResponse.json(
      { error: "partyId and userId are required" },
      { status: 400 },
    );
  }

  const gc = await GroupChat.findOne({ partyId }).lean({ virtuals: true });
  if (!gc) {
    return NextResponse.json(
      { error: "Group chat not unlocked yet", code: "NOT_ENABLED" },
      { status: 404 },
    );
  }
  // Membership gate: only paid guests + the host can read the group chat.
  const isMember = gc.members.some((m: any) => m.userId === userId);
  if (!isMember) {
    return NextResponse.json(
      { error: "You haven't unlocked this group chat yet", code: "NOT_MEMBER" },
      { status: 403 },
    );
  }

  // Fetch all member users for enrichment
  const memberUserIds = gc.members.map((m: any) => m.userId);
  const memberUsers = await User.find({ _id: { $in: memberUserIds } }).lean({ virtuals: true });
  const userMap = new Map(memberUsers.map((u) => [u.id ?? u._id?.toString(), u]));

  const gcId = gc.id ?? gc._id?.toString();

  const serialized: GroupChatType = {
    id: gcId,
    partyId: gc.partyId,
    members: gc.members.map((m: any) => {
      const mu = userMap.get(m.userId);
      return {
        id: m._id?.toString(),
        userId: m.userId,
        name: mu?.name ?? "Guest",
        avatarUrl: mu?.avatarUrl ?? null,
        joinedAt: m.joinedAt?.toISOString?.() ?? String(m.joinedAt ?? ""),
      };
    }),
    messages: gc.messages.map((m: any) => ({
      id: m._id?.toString(),
      groupChatId: gcId,
      senderId: m.senderId,
      content: m.content,
      kind: (m.kind as "text" | "system" | "offer") ?? "text",
      offerBrand: m.offerBrand ?? null,
      createdAt: m.createdAt?.toISOString?.() ?? String(m.createdAt ?? ""),
      sender: {
        id: m.senderId,
        name: gc.members.find((mm: any) => mm.userId === m.senderId)
          ? userMap.get(m.senderId)?.name ?? "Guest"
          : "Guest",
        avatarUrl: gc.members.find((mm: any) => mm.userId === m.senderId)
          ? userMap.get(m.senderId)?.avatarUrl ?? null
          : null,
      },
    })),
  };
  return NextResponse.json({ groupChat: serialized });
}

// POST /api/group-chats  { groupChatId, senderId, content }
// Send a text message to the group chat.
async function _POST(req: NextRequest) {
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
  const gc = await GroupChat.findById(groupChatId).lean({ virtuals: true });
  if (!gc) {
    return NextResponse.json({ error: "Group chat not found" }, { status: 404 });
  }
  const isMember = gc.members.some((m: any) => m.userId === senderId);
  if (!isMember) {
    return NextResponse.json(
      { error: "You're not a member of this group chat" },
      { status: 403 },
    );
  }

  // Push a new message into the embedded messages array
  const newMsg = {
    senderId,
    content: content.trim(),
    kind: "text",
    createdAt: new Date(),
  };
  await GroupChat.findByIdAndUpdate(groupChatId, {
    $push: { messages: newMsg },
    $set: { updatedAt: new Date() },
  });

  return NextResponse.json(
    {
      message: {
        groupChatId,
        senderId,
        content: content.trim(),
        kind: "text",
        createdAt: newMsg.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}

export const GET = withDB(_GET);
export const POST = withDB(_POST);
