import { NextRequest, NextResponse } from "next/server";
import { withDB } from "@/lib/db/mongodb";
import { User } from "@/lib/db/models";
import type { VibeUser } from "@/lib/types";

function serializeUser(u: any): VibeUser {
  return {
    id: u.id ?? u._id?.toString(),
    name: u.name,
    username: u.username,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    city: u.city,
    instagram: u.instagram,
    vibePrefs: u.vibePrefs,
    profession: u.profession,
    role: u.role,
    vibes: u.vibes,
    hosted: u.hosted,
    rating: u.rating,
    ratingCount: u.ratingCount,
    trustScore: u.trustScore,
    trustCount: u.trustCount,
  };
}

// GET /api/users?phone=...  or  /api/users?id=...
async function _GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");
  const id = searchParams.get("id");

  let user: any = null;
  if (phone) {
    user = await User.findOne({ phone }).lean({ virtuals: true });
  } else if (id) {
    user = await User.findById(id).lean({ virtuals: true });
  } else {
    return NextResponse.json({ error: "phone or id required" }, { status: 400 });
  }

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ user: serializeUser(user) });
}

// PATCH /api/users?id=...
async function _PATCH(req: NextRequest) {
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
    "role",
  ];
  const data: Record<string, unknown> = {};
  for (const k of allowed) {
    if (body[k] !== undefined) data[k] = body[k];
  }

  const updated = await User.findByIdAndUpdate(id, { $set: data }, { new: true }).lean({ virtuals: true });
  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ user: serializeUser(updated) });
}

export const GET = withDB(_GET);
export const PATCH = withDB(_PATCH);
