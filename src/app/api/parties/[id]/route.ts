import { NextRequest, NextResponse } from "next/server";
import { withDB } from "@/lib/db/mongodb";
import { Party as PartyModel, User, JoinRequest, PartyMedia as PartyMediaModel } from "@/lib/db/models";
import { parseVibes, type Party, type PartyMedia } from "@/lib/types";

function serialize(p: any): Party {
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
    mediaCleaned: p.mediaCleaned ?? false,
    cleanedAt: p.cleanedAt?.toISOString?.() ?? (p.cleanedAt ? String(p.cleanedAt) : null),
    cleanedMessage: p.cleanedMessage ?? null,
    createdAt: p.createdAt?.toISOString?.() ?? String(p.createdAt ?? ""),
    media: Array.isArray(p.media)
      ? (p.media
          .map((m: any) => ({
            id: m.id ?? m._id?.toString(),
            partyId: m.partyId,
            url: m.url,
            type: m.type === "video" ? "video" : "image",
            caption: m.caption ?? "",
            position: m.position ?? 0,
            createdAt: m.createdAt?.toISOString?.() ?? String(m.createdAt ?? ""),
          }))
          .sort((a: PartyMedia, b: PartyMedia) => a.position - b.position) as PartyMedia[])
      : [],
    // Inline host snapshot left null here — the full host object is returned
    // alongside the party in the detail response. The list API populates these.
    hostAvatarUrl: null,
    hostRating: null,
    hostHosted: null,
    hostVerified: null,
  };
}

// GET /api/parties/[id]
async function _GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const party = await PartyModel.findById(id).lean({ virtuals: true });
  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  // Fetch host, requests, and media in parallel
  // Try hostId first; if that fails or is missing, fall back to a name lookup
  let host: any = null;
  try {
    if (party.hostId) {
      host = await User.findById(party.hostId).lean({ virtuals: true });
    }
    if (!host && party.hostName) {
      host = await User.findOne({ name: party.hostName }).lean({ virtuals: true });
    }
  } catch (err) {
    console.warn(`[parties/[id]] Host lookup failed for party ${id}:`, err);
  }

  const [requests, media] = await Promise.all([
    JoinRequest.find({ partyId: id }).sort({ createdAt: -1 }).lean({ virtuals: true }),
    PartyMediaModel.find({ partyId: id }).sort({ position: 1 }).lean({ virtuals: true }),
  ]);

  // Attach media to party for serialization
  (party as any).media = media;

  // Build the host response — if the User record is missing, provide a
  // graceful fallback using the party's stored hostName so the UI never
  // crashes with a null host.
  const hostResponse = host
    ? {
        id: host.id ?? host._id?.toString(),
        name: host.name,
        username: host.username,
        bio: host.bio,
        avatarUrl: host.avatarUrl,
        city: host.city,
        instagram: host.instagram,
        vibePrefs: host.vibePrefs,
        profession: host.profession,
        role: host.role,
        vibes: host.vibes,
        hosted: host.hosted,
        rating: host.rating,
        ratingCount: host.ratingCount,
        trustScore: host.trustScore,
        trustCount: host.trustCount,
      }
    : {
        id: party.hostId ?? null,
        name: party.hostName || "Unknown Host",
        username: null,
        bio: null,
        avatarUrl: null,
        city: null,
        instagram: null,
        vibePrefs: "",
        profession: null,
        role: null as string | null,
        vibes: 0,
        hosted: 0,
        rating: 0,
        ratingCount: 0,
        trustScore: 0,
        trustCount: 0,
      };

  return NextResponse.json({
    party: serialize(party),
    host: hostResponse,
    requests: requests.map((r: any) => ({
      ...r,
      id: r.id ?? r._id?.toString(),
      createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt ?? ""),
      updatedAt: r.updatedAt?.toISOString?.() ?? String(r.updatedAt ?? ""),
    })),
    vibes: parseVibes(party.vibes),
  });
}

export const GET = withDB(_GET);
