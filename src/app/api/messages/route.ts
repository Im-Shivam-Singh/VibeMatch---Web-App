import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/messages — persist a message (used as fallback when WS unavailable)
export async function POST(req: NextRequest) {
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

  const msg = await db.message.create({
    data: { threadId, senderId, receiverId, content },
  });

  await db.chatThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(
    {
      ...msg,
      createdAt: msg.createdAt.toISOString(),
    },
    { status: 201 },
  );
}
