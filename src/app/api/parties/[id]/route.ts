import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseVibes, type Party, type PartyMedia } from "@/lib/types";

function serialize(p: any): Party {
  return {
    id: p.id,
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
    createdAt: p.createdAt.toISOString(),
    media: Array.isArray(p.media)
      ? (p.media
          .map((m: any) => ({
            id: m.id,
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
  const party = await db.party.findUnique({
    where: { id },
    include: {
      host: true,
      requests: { orderBy: { createdAt: "desc" } },
      media: { orderBy: { position: "asc" } },
    },
  });
  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }
  return NextResponse.json({
    party: serialize(party),
    host: party.host
      ? {
          id: party.host.id,
          name: party.host.name,
          username: party.host.username,
          bio: party.host.bio,
          avatarUrl: party.host.avatarUrl,
          city: party.host.city,
          instagram: party.host.instagram,
          vibePrefs: party.host.vibePrefs,
          vibes: party.host.vibes,
          hosted: party.host.hosted,
          rating: party.host.rating,
          ratingCount: party.host.ratingCount,
        }
      : null,
    requests: party.requests.map((r: any) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    vibes: parseVibes(party.vibes),
  });
}
