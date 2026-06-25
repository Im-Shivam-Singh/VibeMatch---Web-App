import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseVibes, type Party, type PartyCreateInput } from "@/lib/types";

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

// GET /api/parties?city=Delhi&vibe=Techno&q=rooftop
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");
  const vibe = searchParams.get("vibe");
  const q = searchParams.get("q")?.trim().toLowerCase();

  const parties = await db.party.findMany({
    where: {
      ...(city ? { city } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let filtered = parties;
  if (vibe) {
    filtered = filtered.filter((p) => parseVibes(p.vibes).includes(vibe));
  }
  if (q) {
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.area.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }

  return NextResponse.json({ parties: filtered.map(serialize) });
}

// POST /api/parties
export async function POST(req: NextRequest) {
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
  } = body;

  if (!title || !city || !area || !date || !time || !hostName) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  // try to associate with a host user by hostName
  const host = await db.user.findFirst({ where: { name: hostName } });

  const party = await db.party.create({
    data: {
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
      hostId: host?.id,
      coverUrl: coverUrl || null,
      guestCount: 0,
    },
  });

  if (host) {
    await db.user.update({
      where: { id: host.id },
      data: { hosted: { increment: 1 } },
    });
  }

  return NextResponse.json({ party: serialize(party) }, { status: 201 });
}
