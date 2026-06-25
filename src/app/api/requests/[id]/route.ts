import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH /api/requests/[id]  { status: "accepted" | "rejected" }
// Updates a join request status (host action). When accepting, also bumps
// guestCount is left as-is (already incremented on POST). On rejection we
// decrement guestCount back so the slot is released.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { status: "accepted" | "rejected" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { status } = body;
  if (status !== "accepted" && status !== "rejected") {
    return NextResponse.json(
      { error: "status must be 'accepted' or 'rejected'" },
      { status: 400 },
    );
  }

  const existing = await db.joinRequest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // If we are rejecting a previously-accepted or pending request, free the slot
  if (status === "rejected" && existing.status !== "rejected") {
    await db.party.update({
      where: { id: existing.partyId },
      data: { guestCount: { decrement: 1 } },
    });
  }
  // If re-accepting a previously-rejected request, re-bump the count
  if (status === "accepted" && existing.status === "rejected") {
    await db.party.update({
      where: { id: existing.partyId },
      data: { guestCount: { increment: 1 } },
    });
  }

  const updated = await db.joinRequest.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
