import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { PartyReview } from "@/lib/types";

function serialize(r: any): PartyReview {
  return {
    id: r.id,
    partyId: r.partyId,
    userId: r.userId,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    user: r.user
      ? {
          id: r.user.id,
          name: r.user.name,
          avatarUrl: r.user.avatarUrl,
        }
      : undefined,
  };
}

// GET /api/reviews?partyId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const partyId = searchParams.get("partyId");
  if (!partyId) {
    return NextResponse.json({ error: "partyId required" }, { status: 400 });
  }

  const reviews = await db.review.findMany({
    where: { partyId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  const count = reviews.length;
  const avgRating =
    count > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / count
      : 0;

  return NextResponse.json({
    reviews: reviews.map(serialize),
    avgRating: Math.round(avgRating * 10) / 10,
    count,
  });
}

// POST /api/reviews
export async function POST(req: NextRequest) {
  let body: { partyId: string; userId: string; rating: number; comment: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { partyId, userId, rating, comment } = body;
  if (!partyId || !userId || !rating) {
    return NextResponse.json(
      { error: "partyId, userId and rating required" },
      { status: 400 },
    );
  }

  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating must be 1..5" }, { status: 400 });
  }

  // upsert: one review per user per party
  const review = await db.review.upsert({
    where: { partyId_userId: { partyId, userId } },
    update: { rating: Number(rating), comment: comment || "" },
    create: {
      partyId,
      userId,
      rating: Number(rating),
      comment: comment || "",
    },
    include: { user: true },
  });

  return NextResponse.json({ review: serialize(review) }, { status: 201 });
}
