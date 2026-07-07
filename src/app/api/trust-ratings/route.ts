import { NextRequest, NextResponse } from "next/server";
import { withDB } from "@/lib/db/mongodb";
import { TrustRating, User, Party } from "@/lib/db/models";

// GET /api/trust-ratings?guestId=...  → all trust ratings received by a guest
// GET /api/trust-ratings?partyId=...  → all trust ratings for a party's guests
async function _GET(req: NextRequest) {
  const guestId = req.nextUrl.searchParams.get("guestId");
  const partyId = req.nextUrl.searchParams.get("partyId");

  if (!guestId && !partyId) {
    return NextResponse.json(
      { error: "guestId or partyId is required" },
      { status: 400 },
    );
  }

  const filter = guestId ? { guestId } : { partyId: partyId ?? undefined };
  const ratings = await TrustRating.find(filter)
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

  // Enrich with host and party info
  const hostIds = [...new Set(ratings.map((r) => r.hostId))];
  const ratingPartyIds = [...new Set(ratings.map((r) => r.partyId))];

  const [hosts, parties] = await Promise.all([
    User.find({ _id: { $in: hostIds } }).lean({ virtuals: true }),
    Party.find({ _id: { $in: ratingPartyIds } }).lean({ virtuals: true }),
  ]);

  const hostMap = new Map(hosts.map((h) => [h.id ?? h._id?.toString(), h]));
  const partyMap = new Map(parties.map((p) => [p.id ?? p._id?.toString(), p]));

  const enriched = ratings.map((r) => ({
    ...r,
    id: r.id ?? r._id?.toString(),
    host: hostMap.get(r.hostId) ?? null,
    party: partyMap.get(r.partyId) ?? null,
    createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt ?? ""),
  }));

  // If guestId, also return the aggregated trust score + count
  if (guestId) {
    const user = await User.findById(guestId).lean({ virtuals: true });
    return NextResponse.json({
      ratings: enriched,
      trustScore: user?.trustScore ?? 5.0,
      trustCount: user?.trustCount ?? 0,
    });
  }

  return NextResponse.json({ ratings: enriched });
}

// POST /api/trust-ratings → host rates a guest after a party
// Body: { partyId, hostId, guestId, rating (1..5), note? }
async function _POST(req: NextRequest) {
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
  const existing = await TrustRating.findOne({ partyId, guestId }).lean({ virtuals: true });
  let trust: any;
  if (existing) {
    trust = await TrustRating.findByIdAndUpdate(
      existing.id ?? existing._id,
      { $set: { rating: r, note: note ?? "" } },
      { new: true },
    ).lean({ virtuals: true });
  } else {
    trust = await TrustRating.create({
      partyId,
      hostId,
      guestId,
      rating: r,
      note: note ?? "",
    });
    trust = trust.toObject({ virtuals: true });
  }

  // Recompute the guest's aggregate trust score using aggregation
  const agg = await TrustRating.aggregate([
    { $match: { guestId } },
    { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  const avgRating = agg[0]?.avgRating ?? 5.0;
  const count = agg[0]?.count ?? 0;

  await User.findByIdAndUpdate(guestId, {
    $set: { trustScore: Math.round(avgRating * 10) / 10, trustCount: count },
  });

  return NextResponse.json(
    {
      trust: { ...trust, id: trust.id ?? trust._id?.toString() },
      trustScore: Math.round(avgRating * 10) / 10,
    },
    { status: 201 },
  );
}

export const GET = withDB(_GET);
export const POST = withDB(_POST);
