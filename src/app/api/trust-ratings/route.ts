import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/trust-ratings?guestId=...  → all trust ratings received by a guest
// GET /api/trust-ratings?partyId=...  → all trust ratings for a party's guests
export async function GET(req: NextRequest) {
  const guestId = req.nextUrl.searchParams.get("guestId");
  const partyId = req.nextUrl.searchParams.get("partyId");

  if (!guestId && !partyId) {
    return NextResponse.json(
      { error: "guestId or partyId is required" },
      { status: 400 },
    );
  }

  const where = guestId ? { guestId } : { partyId: partyId ?? undefined };
  const ratings = await db.trustRating.findMany({
    where,
    include: { host: true, party: true },
    orderBy: { createdAt: "desc" },
  });

  // If guestId, also return the aggregated trust score + count
  if (guestId) {
    const user = await db.user.findUnique({
      where: { id: guestId },
      select: { trustScore: true, trustCount: true },
    });
    return NextResponse.json({
      ratings,
      trustScore: user?.trustScore ?? 5.0,
      trustCount: user?.trustCount ?? 0,
    });
  }

  return NextResponse.json({ ratings });
}

// POST /api/trust-ratings → host rates a guest after a party
// Body: { partyId, hostId, guestId, rating (1..5), note? }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { partyId, hostId, guestId, rating, note } = body;

  if (!partyId || !hostId || !guestId || !rating) {
    return NextResponse.json(
      { error: "partyId, hostId, guestId, and rating are required" },
      { status: 400 },
    );
  }

  const r = Math.max(1, Math.min(5, Math.round(rating)));

  // Upsert — one trust rating per guest per party
  const trust = await db.trustRating.upsert({
    where: { partyId_guestId: { partyId, guestId } },
    update: { rating: r, note: note ?? "" },
    create: {
      partyId,
      hostId,
      guestId,
      rating: r,
      note: note ?? "",
    },
  });

  // Recompute the guest's aggregate trust score
  const agg = await db.trustRating.aggregate({
    where: { guestId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await db.user.update({
    where: { id: guestId },
    data: {
      trustScore: agg._avg.rating ?? 5.0,
      trustCount: agg._count.rating,
    },
  });

  return NextResponse.json({ trust, trustScore: agg._avg.rating ?? 5.0 }, { status: 201 });
}
