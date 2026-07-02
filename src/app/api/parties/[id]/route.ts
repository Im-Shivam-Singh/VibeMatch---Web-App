import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Party as PartyModel, User, JoinRequest, PartyMedia as PartyMediaModel } from "@/models";
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
  };
}

// GET /api/parties/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  await connectDB();

  const party = await PartyModel.findById(id).lean({ virtuals: true });
  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  // Fetch host, requests, and media in parallel
  const [host, requests, media] = await Promise.all([
    party.hostId ? User.findById(party.hostId).lean({ virtuals: true }) : null,
    JoinRequest.find({ partyId: id }).sort({ createdAt: -1 }).lean({ virtuals: true }),
    PartyMediaModel.find({ partyId: id }).sort({ position: 1 }).lean({ virtuals: true }),
  ]);

  // Attach media to party for serialization
  (party as any).media = media;

  return NextResponse.json({
    party: serialize(party),
    host: host
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
      : null,
    requests: requests.map((r: any) => ({
      ...r,
      id: r.id ?? r._id?.toString(),
      createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt ?? ""),
      updatedAt: r.updatedAt?.toISOString?.() ?? String(r.updatedAt ?? ""),
    })),
    vibes: parseVibes(party.vibes),
  });
}
