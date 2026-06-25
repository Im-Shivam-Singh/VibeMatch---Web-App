import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { VibeUser } from "@/lib/types";

function serializeUser(u: any): VibeUser {
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

// In-memory OTP store (dev only). Maps phone -> { otp, expires }
const otpStore = new Map<string, { otp: string; expires: number }>();

function genOtp() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// POST /api/auth/otp
// body: { step: "send" | "verify", phone, otp?, name? }
export async function POST(req: NextRequest) {
  let body: { step: string; phone: string; otp?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { step, phone } = body;
  if (!phone) {
    return NextResponse.json({ error: "phone required" }, { status: 400 });
  }

  if (step === "send") {
    const otp = genOtp();
    otpStore.set(phone, { otp, expires: Date.now() + 5 * 60 * 1000 });
    // In a real app we'd send an SMS. For dev we return it so the UI can auto-fill.
    return NextResponse.json({ sent: true, devOtp: otp });
  }

  if (step === "verify") {
    const entry = otpStore.get(phone);
    if (!entry || entry.expires < Date.now()) {
      return NextResponse.json(
        { error: "OTP expired, request a new one" },
        { status: 400 },
      );
    }
    if (body.otp !== entry.otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }
    otpStore.delete(phone);

    // find or create user
    let user = await db.user.findUnique({ where: { phone } });
    if (!user) {
      const name = body.name?.trim() || "New Viber";
      user = await db.user.create({
        data: {
          phone,
          name,
          bio: "Just here for the vibes ✨",
          city: "Mumbai",
          avatarUrl:
            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80&auto=format&fit=crop",
        },
      });
    }

    return NextResponse.json({ user: serializeUser(user), token: phone });
  }

  return NextResponse.json({ error: "Invalid step" }, { status: 400 });
}
