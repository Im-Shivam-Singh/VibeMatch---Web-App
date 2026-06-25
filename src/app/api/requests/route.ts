import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { JoinRequestInput } from "@/lib/types";

// POST /api/requests  — send a "Request to Connect"
export async function POST(req: NextRequest) {
  let body: JoinRequestInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { partyId, requesterName, introMessage } = body;

  if (!partyId || !requesterName || !introMessage) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const party = await db.party.findUnique({ where: { id: partyId } });
  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  // try to associate with a user by name
  const requester = await db.user.findFirst({ where: { name: requesterName } });

  const request = await db.joinRequest.create({
    data: {
      partyId,
      requesterName,
      introMessage,
      requesterId: requester?.id,
    },
  });

  // increment party guest count optimistically (the host will confirm)
  await db.party.update({
    where: { id: partyId },
    data: { guestCount: { increment: 1 } },
  });

  return NextResponse.json(
    {
      id: request.id,
      message: "Request sent! The host will get back to you shortly.",
      status: request.status,
    },
    { status: 201 },
  );
}

// GET /api/requests?partyId=...  — list requests for a party (host view)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const partyId = searchParams.get("partyId");
  if (!partyId) {
    return NextResponse.json({ error: "partyId required" }, { status: 400 });
  }
  const requests = await db.joinRequest.findMany({
    where: { partyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    requests: requests.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
}
