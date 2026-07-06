import { NextRequest, NextResponse } from "next/server";
import { withDB } from "@/lib/mongodb";
import { Party as PartyModel, User, PartyMedia as PartyMediaModel } from "@/models";
import {
  parseVibes,
  partyCoords,
  haversineKm,
  type Party,
  type PartyCreateInput,
} from "@/lib/types";

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
    spotifyPlaylistUrl: p.spotifyPlaylistUrl || '',
    createdAt: p.createdAt?.toISOString?.() ?? String(p.createdAt ?? ""),
    // Intentionally empty in list payloads to keep the response small.
    // The full media list is only included on the GET /api/parties/[id] route.
    media: [],
    // Inline host snapshot — denormalized so the frontend can render host
    // info (avatar, rating, verified badge) without a separate lookup.
    hostAvatarUrl: hostUser?.avatarUrl ?? null,
    hostRating: hostUser?.rating ?? null,
    hostHosted: hostUser?.hosted ?? null,
    hostVerified: !!hostUser,
  };
}

// GET /api/parties?city=Delhi&vibe=Techno&q=rooftop&profession=Student
// GET /api/parties?lat=28.61&lng=77.20&radiusKm=5  — proximity filter (map view)
async function _GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");
  const vibe = searchParams.get("vibe");
  const q = searchParams.get("q")?.trim().toLowerCase();
  const profession = searchParams.get("profession");

  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radiusKm = searchParams.get("radiusKm");
  const hasProximity =
    lat !== null && lng !== null && radiusKm !== null &&
    !Number.isNaN(parseFloat(lat)) && !Number.isNaN(parseFloat(lng)) &&
    !Number.isNaN(parseFloat(radiusKm));

  const filter: Record<string, unknown> = {};
  if (city) filter.city = city;

  // When a profession filter is set, include the host so we can filter by
  // host.profession ("who are you" → find parties hosted by your crowd).
  let parties = await PartyModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean({ virtuals: true });

  // Batch-resolve host users for inline host data in the response.
  // This avoids N+1 lookups and lets the frontend show host avatars,
  // ratings, and verified badges without a separate API call.
  const allHostIds = [...new Set(parties.map((p) => p.hostId).filter(Boolean))] as string[];
  let hostMap = new Map<string, any>();
  if (allHostIds.length > 0) {
    try {
      const hosts = await User.find({ _id: { $in: allHostIds } }).lean({ virtuals: true });
      for (const h of hosts) {
        hostMap.set(h.id ?? h._id?.toString(), h);
      }
    } catch (err) {
      console.warn("[parties] Host batch lookup failed (non-fatal):", err);
    }
  }

  // If profession filter is active, filter by host profession
  if (profession && parties.length > 0) {
    const professionHostIds = new Set<string>();
    for (const [hid, h] of hostMap) {
      if (h.profession === profession) professionHostIds.add(hid);
    }
    parties = parties.map((p) => {
      (p as any).host = p.hostId && professionHostIds.has(p.hostId) ? { profession } : null;
      return p;
    });
  }

  let filtered = parties;
  if (vibe) {
    filtered = filtered.filter((p) => parseVibes(p.vibes).includes(vibe));
  }
  if (q) {
    // Search across title, area, description, AND city so a "place / city"
    // search query surfaces matching parties.
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.area.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }
  if (profession) {
    // Filter to parties whose host's profession matches (parties without a
    // host user are dropped).
    filtered = filtered.filter(
      (p) => (p as any).host?.profession === profession,
    );
  }

  // Proximity filter — keep only parties within radiusKm of (lat,lng).
  // Falls back to partyGeoFallback (via partyCoords) when the party has no
  // stored lat/lng, so older seeded parties still appear on the map.
  if (hasProximity) {
    const center = { lat: parseFloat(lat!), lng: parseFloat(lng!) };
    const radius = parseFloat(radiusKm!);
    filtered = filtered.filter((p) => {
      const coords = partyCoords({
        lat: p.lat,
        lng: p.lng,
        id: p.id ?? p._id?.toString(),
        city: p.city,
      });
      return haversineKm(center, coords) <= radius;
    });
  }

  return NextResponse.json({ parties: filtered.map((p) => serialize(p, hostMap)) });
}

// POST /api/parties
async function _POST(req: NextRequest) {
  let body: PartyCreateInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    title,
    city,
    area,
    date,
    time,
    fee,
    maxGuests,
    vibes,
    description,
    hostName,
    coverUrl,
    lat,
    lng,
    securityBooked,
    securityFee,
    media,
    spotifyPlaylistUrl,
  } = body;

  if (!title || !city || !area || !date || !time || !hostName) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  // try to associate with a host user by hostName
  // Wrap in try/catch so a bad hostId or DB glitch doesn't prevent party creation
  let host: any = null;
  try {
    host = await User.findOne({ name: hostName }).lean({ virtuals: true });
  } catch (err) {
    console.warn(`[parties] Host lookup failed for name "${hostName}":`, err);
  }

  // If the host didn't pass an explicit coverUrl but added media, the first
  // media item becomes the cover (keeps legacy party-card rendering working).
  const mediaList = Array.isArray(media) ? media : [];
  const resolvedCoverUrl =
    coverUrl || (mediaList.length > 0 ? mediaList[0].url : null);

  const party = await PartyModel.create({
    title,
    city,
    area,
    date,
    time,
    fee: Number(fee) || 0,
    maxGuests: Number(maxGuests) || 10,
    vibes: (vibes || []).join(","),
    description: description || "",
    hostName,
    hostId: host?.id ?? host?._id?.toString() ?? null,
    coverUrl: resolvedCoverUrl,
    lat: typeof lat === "number" ? lat : null,
    lng: typeof lng === "number" ? lng : null,
    guestCount: 0,
    securityBooked: Boolean(securityBooked),
    securityFee: Number(securityFee) || 0,
    securityStatus: securityBooked ? "requested" : "",
    spotifyPlaylistUrl: spotifyPlaylistUrl || '',
  });

  // Persist the media gallery (sorted by position).
  if (mediaList.length > 0) {
    const mediaDocs = mediaList.slice(0, 12).map((m, index) => ({
      partyId: party.id ?? party._id?.toString(),
      url: m.url,
      type: m.type === "video" ? "video" : "image",
      caption: m.caption ?? "",
      position: index,
    }));
    await PartyMediaModel.insertMany(mediaDocs);
  }

  if (host) {
    await User.findByIdAndUpdate(host.id ?? host._id, { $inc: { hosted: 1 } });
  }

  // Get lean version for serialization
  const leanParty = party.toObject({ virtuals: true });
  return NextResponse.json({ party: serialize(leanParty) }, { status: 201 });
}

export const GET = withDB(_GET);
export const POST = withDB(_POST);
