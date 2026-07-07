import { NextRequest, NextResponse } from "next/server";
import { withDB } from "@/lib/db/mongodb";
import { PartyView, Party } from "@/lib/db/models";

// POST /api/views — record a party view
async function _POST(req: NextRequest) {
  let body: { partyId: string; userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { partyId, userId } = body;
  if (!partyId) {
    return NextResponse.json({ error: "partyId required" }, { status: 400 });
  }

  await PartyView.create({
    partyId,
    userId: userId || null,
  });

  return NextResponse.json({ recorded: true }, { status: 201 });
}

// GET /api/views?partyId=... — get view count for a party
// GET /api/views?hostId=... — get total views across all hosted parties
async function _GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const partyId = searchParams.get("partyId");
  const hostId = searchParams.get("hostId");

  if (partyId) {
    const count = await PartyView.countDocuments({ partyId });
    return NextResponse.json({ partyId, views: count });
  }

  if (hostId) {
    // Total views across all parties hosted by this user
    const parties = await Party.find({ hostId }).lean({ virtuals: true });
    const partyIds = parties.map((p) => p.id ?? p._id?.toString());
    const views = await PartyView.countDocuments({ partyId: { $in: partyIds } });
    // Also get per-party breakdown using aggregation
    const breakdown = await PartyView.aggregate([
      { $match: { partyId: { $in: partyIds } } },
      { $group: { _id: "$partyId", views: { $sum: 1 } } },
    ]);
    return NextResponse.json({
      hostId,
      totalViews: views,
      partyCount: parties.length,
      breakdown: breakdown.map((b) => ({
        partyId: b._id,
        views: b.views,
      })),
    });
  }

  return NextResponse.json(
    { error: "partyId or hostId required" },
    { status: 400 },
  );
}

export const POST = withDB(_POST);
export const GET = withDB(_GET);
