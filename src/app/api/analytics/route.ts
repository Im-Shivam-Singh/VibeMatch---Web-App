import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { HostAnalytics } from "@/lib/types";

// GET /api/analytics?hostId=...
// Returns aggregate stats across all parties hosted by this user.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hostId = searchParams.get("hostId");
  if (!hostId) {
    return NextResponse.json({ error: "hostId required" }, { status: 400 });
  }

  const parties = await db.party.findMany({
    where: { hostId },
    select: {
      id: true,
      title: true,
      maxGuests: true,
      guestCount: true,
      requests: { select: { id: true, status: true } },
      views: { select: { id: true } },
      reviews: { select: { rating: true } },
    },
  });

  if (parties.length === 0) {
    const empty: HostAnalytics = {
      hostId,
      totalViews: 0,
      partyCount: 0,
      totalGuests: 0,
      totalCapacity: 0,
      totalRequests: 0,
      acceptedRequests: 0,
      pendingRequests: 0,
      rejectedRequests: 0,
      acceptanceRate: 0,
      avgRating: 0,
      reviewCount: 0,
      topParties: [],
    };
    return NextResponse.json(empty);
  }

  let totalViews = 0;
  let totalGuests = 0;
  let totalCapacity = 0;
  let totalRequests = 0;
  let acceptedRequests = 0;
  let pendingRequests = 0;
  let rejectedRequests = 0;
  let ratingSum = 0;
  let reviewCount = 0;
  const topParties: HostAnalytics["topParties"] = [];

  for (const p of parties) {
    totalViews += p.views.length;
    totalGuests += p.guestCount;
    totalCapacity += p.maxGuests;
    totalRequests += p.requests.length;
    const accepted = p.requests.filter((r) => r.status === "accepted").length;
    const pending = p.requests.filter((r) => r.status === "pending").length;
    const rejected = p.requests.filter((r) => r.status === "rejected").length;
    acceptedRequests += accepted;
    pendingRequests += pending;
    rejectedRequests += rejected;
    if (p.reviews.length > 0) {
      ratingSum += p.reviews.reduce((s, r) => s + r.rating, 0);
      reviewCount += p.reviews.length;
    }
    topParties.push({
      partyId: p.id,
      title: p.title,
      views: p.views.length,
      requests: p.requests.length,
      guests: p.guestCount,
      capacity: p.maxGuests,
    });
  }

  topParties.sort((a, b) => b.views - a.views);

  const result: HostAnalytics = {
    hostId,
    totalViews,
    partyCount: parties.length,
    totalGuests,
    totalCapacity,
    totalRequests,
    acceptedRequests,
    pendingRequests,
    rejectedRequests,
    acceptanceRate:
      totalRequests > 0
        ? Math.round((acceptedRequests / totalRequests) * 100)
        : 0,
    avgRating: reviewCount > 0 ? Math.round((ratingSum / reviewCount) * 10) / 10 : 0,
    reviewCount,
    topParties: topParties.slice(0, 5),
  };

  return NextResponse.json(result);
}
