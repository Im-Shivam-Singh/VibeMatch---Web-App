import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { VibeUser } from "@/lib/types";

function serializeUser(u: { id: string; name: string; username: string | null; bio: string | null; avatarUrl: string | null; city: string | null; instagram: string | null; vibePrefs: string; vibes: number; hosted: number; rating: number; ratingCount: number }): VibeUser {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    city: u.city,
    instagram: u.instagram,
    vibePrefs: u.vibePrefs,
    vibes: u.vibes,
    hosted: u.hosted,
    rating: u.rating,
    ratingCount: u.ratingCount,
  };
}

// GET /api/users?phone=...  or  /api/users?id=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");
  const id = searchParams.get("id");

  let user: Awaited<ReturnType<typeof db.user.findUnique>> = null;
  if (phone) {
    user = await db.user.findUnique({ where: { phone } });
  } else if (id) {
    user = await db.user.findUnique({ where: { id } });
  } else {
    return NextResponse.json({ error: "phone or id required" }, { status: 400 });
  }

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ user: serializeUser(user) });
}

// PATCH /api/users?id=...
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  let body: Partial<VibeUser>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const allowed: (keyof VibeUser)[] = [
    "name",
    "username",
    "bio",
    "avatarUrl",
    "city",
    "instagram",
    "vibePrefs",
  ];
  const data: Record<string, unknown> = {};
  for (const k of allowed) {
    if (body[k] !== undefined) data[k] = body[k];
  }

  const updated = await db.user.update({ where: { id }, data });
  return NextResponse.json({ user: serializeUser(updated) });
}
