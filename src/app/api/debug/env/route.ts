import { NextResponse } from "next/server";

// GET /api/debug/env — Debug endpoint to check which MongoDB env vars are visible
// This helps troubleshoot Vercel environment variable issues.
// IMPORTANT: This only shows whether vars EXIST and their LENGTH, never the values.
export async function GET() {
  const envCheck = {
    NODE_ENV: process.env.NODE_ENV || "not set",
    VERCEL: process.env.VERCEL || "not set",
    VERCEL_REGION: process.env.VERCEL_REGION || "not set",
    // MongoDB env vars — only show existence and length, never values
    MONGODB_URI_exists: !!process.env.MONGODB_URI,
    MONGODB_URI_length: (process.env.MONGODB_URI || "").length,
    MONGODB_URI_prefix: process.env.MONGODB_URI
      ? process.env.MONGODB_URI.substring(0, 20) + "..."
      : "not set",
    MONGODB_URL_exists: !!process.env.MONGODB_URL,
    MONGODB_URL_length: (process.env.MONGODB_URL || "").length,
    MONGO_URI_exists: !!process.env.MONGO_URI,
    MONGO_URI_length: (process.env.MONGO_URI || "").length,
    DATABASE_URL_exists: !!process.env.DATABASE_URL,
    DATABASE_URL_length: (process.env.DATABASE_URL || "").length,
    DATABASE_URL_isFile: (process.env.DATABASE_URL || "").startsWith("file:"),
    // All env var keys (for debugging — doesn't expose values)
    all_env_keys: Object.keys(process.env).sort(),
  };

  return NextResponse.json(envCheck, { status: 200 });
}
