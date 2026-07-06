import { NextRequest, NextResponse } from "next/server";
import { withDB } from "@/lib/mongodb";
import { Party as PartyModel, User } from "@/models";
import { parseVibes, type Party } from "@/lib/types";

function serialize(p: any, hostMap?: Map<string, any>): Party {
  const hostId = p.hostId;
  const hostUser = hostId ? hostMap?.get(hostId) : undefined;
  return {
    id: p.id ?? p._id?.toString(),
    title: p.title,
    city: p.city,
    area: p.area,
    date: p.date,
    time: p.time,
    fee: p.fee,
    maxGuests: p.maxGuests,
    vibes: p.vibes,
    description: p.description,
    hostName: p.hostName,
    hostId: p.hostId,
    coverUrl: p.coverUrl,
    lat: p.lat,
    lng: p.lng,
    guestCount: p.guestCount,
    securityBooked: p.securityBooked,
    securityFee: p.securityFee,
    securityStatus: p.securityStatus,
    groupChatEnabled: p.groupChatEnabled,
    createdAt: p.createdAt?.toISOString?.() ?? String(p.createdAt ?? ""),
    media: [],
    hostAvatarUrl: hostUser?.avatarUrl ?? null,
    hostRating: hostUser?.rating ?? null,
    hostHosted: hostUser?.hosted ?? null,
    hostVerified: !!hostUser,
  };
}

// GET /api/parties/for-you?userId=...
// Personalized feed: rank parties by overlap with the user's vibe preferences
// (User.vibes — a comma-separated string saved from onboarding) and city.
async function _GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const user = await User.findById(userId).lean({ virtuals: true });
  const userVibes = user?.vibePrefs ? parseVibes(user.vibePrefs) : [];
  const userCity = user?.city || null;

  // Pull all upcoming/recent parties (cap at 100)
  const filter: Record<string, unknown> = {};
  if (userCity) filter.city = userCity;
  const all = await PartyModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean({ virtuals: true });

  // Score each party
  const scored = all
    .map((p) => {
      const pv = parseVibes(p.vibes);
      const overlap = pv.filter((v) => userVibes.includes(v)).length;
      const vibeScore = userVibes.length
        ? overlap / userVibes.length
        : 0.5; // neutral if user has no vibes yet
      const cityBonus = userCity && p.city === userCity ? 0.15 : 0;
      const socialScore = Math.min(0.2, p.guestCount / 100); // up to 0.2 boost for popular parties
      const freshness = Math.max(0, 1 - (Date.now() - new Date(p.createdAt).getTime()) / (14 * 86_400_000)) * 0.1;
      const score = vibeScore * 0.55 + cityBonus + socialScore + freshness;
      return { party: p, score, overlap, pv };
    })
    .sort((a, b) => b.score - a.score);

  // Batch-resolve host users for inline host data
  const topParties = (userVibes.length > 0 ? scored : [...scored].sort((a, b) => new Date(b.party.createdAt).getTime() - new Date(a.party.createdAt).getTime()))
    .slice(0, 20);
  const hostIds = [...new Set(topParties.map((s) => s.party.hostId).filter(Boolean))] as string[];
  let hostMap = new Map<string, any>();
  if (hostIds.length > 0) {
    try {
      const hosts = await User.find({ _id: { $in: hostIds } }).lean({ virtuals: true });
      for (const h of hosts) {
        hostMap.set(h.id ?? h._id?.toString(), h);
      }
    } catch (err) {
      console.warn("[parties/for-you] Host batch lookup failed (non-fatal):", err);
    }
  }

  const rankedParties = topParties.map((s) => serialize(s.party, hostMap));

  return NextResponse.json({
    parties: rankedParties,
    matchedVibes: userVibes,
  });
}

export const GET = withDB(_GET);
