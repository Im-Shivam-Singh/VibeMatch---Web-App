import { NextRequest, NextResponse } from "next/server";
import { withDB } from "@/lib/mongodb";
import { Review, User } from "@/models";
import type { PartyReview } from "@/lib/types";

function serialize(r: any, user?: any): PartyReview {
  return {
    id: r.id ?? r._id?.toString(),
    partyId: r.partyId,
    userId: r.userId,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt ?? ""),
    user: user
      ? {
          id: user.id ?? user._id?.toString(),
          name: user.name,
          avatarUrl: user.avatarUrl,
        }
      : undefined,
  };
}

// GET /api/reviews?partyId=...
async function _GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const partyId = searchParams.get("partyId");
  if (!partyId) {
    return NextResponse.json({ error: "partyId required" }, { status: 400 });
  }

  const reviews = await Review.find({ partyId })
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

  // Fetch users for all reviews
  const userIds = [...new Set(reviews.map((r) => r.userId))];
  const users = await User.find({ _id: { $in: userIds } }).lean({ virtuals: true });
  const userMap = new Map(users.map((u) => [u.id ?? u._id?.toString(), u]));

  const count = reviews.length;
  const avgRating =
    count > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / count
      : 0;

  return NextResponse.json({
    reviews: reviews.map((r) => serialize(r, userMap.get(r.userId))),
    avgRating: Math.round(avgRating * 10) / 10,
    count,
  });
}

// POST /api/reviews
async function _POST(req: NextRequest) {
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
  const existing = await Review.findOne({ partyId, userId }).lean({ virtuals: true });
  let review: any;
  if (existing) {
    review = await Review.findByIdAndUpdate(
      existing.id ?? existing._id,
      { $set: { rating: Number(rating), comment: comment || "" } },
      { new: true },
    ).lean({ virtuals: true });
  } else {
    review = await Review.create({
      partyId,
      userId,
      rating: Number(rating),
      comment: comment || "",
    });
    review = review.toObject({ virtuals: true });
  }

  const user = await User.findById(userId).lean({ virtuals: true });

  return NextResponse.json({ review: serialize(review, user) }, { status: 201 });
}

export const GET = withDB(_GET);
export const POST = withDB(_POST);
