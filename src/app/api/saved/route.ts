import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SavedParty, Party } from "@/models";

// GET /api/saved?userId=... — list saved party IDs for a user
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  await connectDB();

  const saved = await SavedParty.find({ userId })
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

  // Fetch associated parties
  const partyIds = saved.map((s) => s.partyId);
  const parties = await Party.find({ _id: { $in: partyIds } }).lean({ virtuals: true });
  const partyMap = new Map(parties.map((p) => [p.id ?? p._id?.toString(), p]));

  return NextResponse.json({
    saved: saved.map((s) => {
      const party = partyMap.get(s.partyId);
      return {
        id: s.id ?? s._id?.toString(),
        partyId: s.partyId,
        createdAt: s.createdAt?.toISOString?.() ?? String(s.createdAt ?? ""),
        party: party
          ? {
              id: party.id ?? party._id?.toString(),
              title: party.title,
              city: party.city,
              area: party.area,
              date: party.date,
              time: party.time,
              fee: party.fee,
              maxGuests: party.maxGuests,
              vibes: party.vibes,
              description: party.description,
              hostName: party.hostName,
              hostId: party.hostId,
              coverUrl: party.coverUrl,
              guestCount: party.guestCount,
              createdAt: party.createdAt?.toISOString?.() ?? String(party.createdAt ?? ""),
            }
          : null,
      };
    }),
    partyIds: saved.map((s) => s.partyId),
  });
}

// POST /api/saved — save a party
export async function POST(req: NextRequest) {
  let body: { userId: string; partyId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { userId, partyId } = body;
  if (!userId || !partyId) {
    return NextResponse.json(
      { error: "userId and partyId required" },
      { status: 400 },
    );
  }

  await connectDB();

  const existing = await SavedParty.findOne({ userId, partyId }).lean({ virtuals: true });
  if (existing) {
    // toggle: unsave
    await SavedParty.findByIdAndDelete(existing.id ?? existing._id);
    return NextResponse.json({ saved: false, partyId });
  }

  await SavedParty.create({ userId, partyId });
  return NextResponse.json({ saved: true, partyId }, { status: 201 });
}

// DELETE /api/saved?userId=...&partyId=... — unsave a party
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const partyId = searchParams.get("partyId");
  if (!userId || !partyId) {
    return NextResponse.json(
      { error: "userId and partyId required" },
      { status: 400 },
    );
  }

  await connectDB();

  const existing = await SavedParty.findOne({ userId, partyId }).lean({ virtuals: true });
  if (!existing) {
    return NextResponse.json({ error: "Not saved" }, { status: 404 });
  }

  await SavedParty.findByIdAndDelete(existing.id ?? existing._id);
  return NextResponse.json({ saved: false, partyId });
}
