import { NextRequest, NextResponse } from "next/server";
import { withDB } from "@/lib/mongodb";
import { Party, JoinRequest, PartyView, Review } from "@/models";
import type { HostAnalytics } from "@/lib/types";

// GET /api/analytics?hostId=...
// Returns aggregate stats across all parties hosted by this user.
async function _GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hostId = searchParams.get("hostId");
  if (!hostId) {
    return NextResponse.json({ error: "hostId required" }, { status: 400 });
  }

  const parties = await Party.find({ hostId }).lean({ virtuals: true });

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

  const partyIds = parties.map((p) => p.id ?? p._id?.toString());

  // Fetch all requests, views, and reviews for these parties in parallel
  const [allRequests, allViews, allReviews] = await Promise.all([
    JoinRequest.find({ partyId: { $in: partyIds } }).lean({ virtuals: true }),
    PartyView.find({ partyId: { $in: partyIds } }).lean({ virtuals: true }),
    Review.find({ partyId: { $in: partyIds } }).lean({ virtuals: true }),
  ]);

  // Group by partyId
  const requestsByParty = new Map<string, any[]>();
  for (const r of allRequests) {
    const list = requestsByParty.get(r.partyId) ?? [];
    list.push(r);
    requestsByParty.set(r.partyId, list);
  }

  const viewsByParty = new Map<string, number>();
  for (const v of allViews) {
    viewsByParty.set(v.partyId, (viewsByParty.get(v.partyId) ?? 0) + 1);
  }

  const reviewsByParty = new Map<string, any[]>();
  for (const r of allReviews) {
    const list = reviewsByParty.get(r.partyId) ?? [];
    list.push(r);
    reviewsByParty.set(r.partyId, list);
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
    const pId = p.id ?? p._id?.toString();
    const pViews = viewsByParty.get(pId) ?? 0;
    const pRequests = requestsByParty.get(pId) ?? [];
    const pReviews = reviewsByParty.get(pId) ?? [];

    totalViews += pViews;
    totalGuests += p.guestCount;
    totalCapacity += p.maxGuests;
    totalRequests += pRequests.length;
    const accepted = pRequests.filter((r: any) => r.status === "accepted").length;
    const pending = pRequests.filter((r: any) => r.status === "pending").length;
    const rejected = pRequests.filter((r: any) => r.status === "rejected").length;
    acceptedRequests += accepted;
    pendingRequests += pending;
    rejectedRequests += rejected;
    if (pReviews.length > 0) {
      ratingSum += pReviews.reduce((s: number, r: any) => s + r.rating, 0);
      reviewCount += pReviews.length;
    }
    topParties.push({
      partyId: pId,
      title: p.title,
      views: pViews,
      requests: pRequests.length,
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

export const GET = withDB(_GET);
