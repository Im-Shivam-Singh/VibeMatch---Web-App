import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
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

// ── Global OTP store (survives hot reloads in dev & serverless cold starts) ──
// On Vercel, serverless function invocations within the same instance share
// the same global scope, so this is more resilient than a module-level Map.
interface OtpEntry {
  otp: string;
  expires: number;
}

interface RateLimitEntry {
  timestamps: number[];
}

declare global {
  var __otpStore: Map<string, OtpEntry> | undefined;
  var __otpRateLimits: Map<string, RateLimitEntry> | undefined;
}

const otpStore: Map<string, OtpEntry> = global.__otpStore ?? new Map();
if (!global.__otpStore) {
  global.__otpStore = otpStore;
}

const rateLimits: Map<string, RateLimitEntry> = global.__otpRateLimits ?? new Map();
if (!global.__otpRateLimits) {
  global.__otpRateLimits = rateLimits;
}

// Rate limit: max 5 OTP sends per phone per 15 minutes
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(phone: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = rateLimits.get(phone);

  if (!entry) {
    rateLimits.set(phone, { timestamps: [now] });
    return { allowed: true };
  }

  // Filter out timestamps outside the window
  const recent = entry.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  entry.timestamps = recent;

  if (recent.length >= RATE_LIMIT_MAX) {
    const oldestInWindow = recent[0];
    const retryAfterMs = oldestInWindow + RATE_LIMIT_WINDOW_MS - now;
    return { allowed: false, retryAfterMs };
  }

  recent.push(now);
  entry.timestamps = recent;
  return { allowed: true };
}

// Periodically clean up expired OTPs and rate limit entries (every ~5 min)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = 0;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, val] of otpStore) {
    if (val.expires < now) otpStore.delete(key);
  }
  for (const [key, val] of rateLimits) {
    val.timestamps = val.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (val.timestamps.length === 0) rateLimits.delete(key);
  }
}

function genOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/otp
// body: { step: "send" | "verify", phone, otp?, name?, role? }
async function _POST(req: NextRequest) {
  cleanup();

  let body: { step: string; phone: string; otp?: string; name?: string; role?: 'host' | 'partier' };
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
    // Rate limit check
    const rateCheck = checkRateLimit(phone);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: "Too many OTP requests. Please wait before requesting another.",
          retryAfterSeconds: Math.ceil((rateCheck.retryAfterMs ?? 60000) / 1000),
        },
        { status: 429 },
      );
    }

    const otp = genOtp();
    otpStore.set(phone, { otp, expires: Date.now() + 5 * 60 * 1000 });

    // In a real app we'd send an SMS. In dev, always return the OTP
    // so the UI can auto-fill — this is critical for the login flow to work.
    return NextResponse.json({
      sent: true,
      devOtp: otp,
    });
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
    let user = await User.findOne({ phone }).lean({ virtuals: true });
    if (!user) {
      const name = body.name?.trim() || "New Viber";
      const role = body.role || "partier";
      user = await User.create({
        phone,
        name,
        role,
        bio: "Just here for the vibes ✨",
        city: "Mumbai",
        avatarUrl:
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80&auto=format&fit=crop",
      });
      // Re-lean to get virtuals
      user = user.toObject({ virtuals: true });
    } else if (body.role && user.role !== body.role) {
      // Update role if provided and different
      await User.updateOne({ phone }, { $set: { role: body.role } });
      user = await User.findOne({ phone }).lean({ virtuals: true });
    }

    return NextResponse.json({ user: serializeUser(user), token: phone });
  }

  return NextResponse.json({ error: "Invalid step" }, { status: 400 });
}

import { withDB } from "@/lib/db/mongodb";
export const POST = withDB(_POST);
