import { NextRequest, NextResponse } from "next/server";
import { withDB } from "@/lib/db/mongodb";
import { Message, ChatThread, User } from "@/lib/db/models";
import { createNotification } from "@/lib/notifications";

// POST /api/messages — persist a message (used as fallback when WS unavailable)
async function _POST(req: NextRequest) {
  let body: {
    threadId: string;
    senderId: string;
    receiverId: string;
    content: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { threadId, senderId, receiverId, content } = body;
  if (!threadId || !senderId || !receiverId || !content) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const msg = await Message.create({
    threadId,
    senderId,
    receiverId,
    content,
  });

  await ChatThread.findByIdAndUpdate(threadId, { $set: { updatedAt: new Date() } });

  // ── Notify the receiver about the new message ─────────────────────
  // Only for real text/video messages (not system or payment messages)
  if (msg.kind === "text" || msg.kind === "video" || !msg.kind) {
    const sender = await User.findById(senderId).lean({ virtuals: true });
    const thread = await ChatThread.findById(threadId).lean({ virtuals: true });
    await createNotification({
      userId: receiverId,
      type: "message",
      title: "New Message",
      body: `${sender?.name ?? "Someone"}: ${content.slice(0, 50)}${content.length > 50 ? "..." : ""}`,
      data: { threadId, partyId: thread?.partyId?.toString() ?? "" },
    });
  }

  return NextResponse.json(
    {
      id: msg.id ?? msg._id?.toString(),
      threadId: msg.threadId,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      content: msg.content,
      read: msg.read,
      kind: msg.kind,
      mediaUrl: msg.mediaUrl,
      requestId: msg.requestId,
      createdAt: msg.createdAt?.toISOString?.() ?? String(msg.createdAt ?? ""),
    },
    { status: 201 },
  );
}

export const POST = withDB(_POST);
