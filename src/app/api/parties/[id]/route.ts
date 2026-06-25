import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseVibes, type Party } from "@/lib/types";

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
    guestCount: p.guestCount,
    createdAt: p.createdAt.toISOString(),
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
    include: { host: true, requests: { orderBy: { createdAt: "desc" } } },
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
