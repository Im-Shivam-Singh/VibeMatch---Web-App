import { NextRequest, NextResponse } from "next/server";
import { withDB } from "@/lib/mongodb";
import { Message, ChatThread } from "@/models";

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
