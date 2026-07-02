import { NextResponse } from "next/server";

// GET /api/health — Health check + MongoDB connection diagnostics
// IMPORTANT: MONGODB_URI is read at request time, not import time.
// This ensures we always see the latest env var value on Vercel serverless.
export async function GET() {
  // Read MONGODB_URI at request time — never trust a module-level cached value
  const uri = process.env.MONGODB_URI || "";

  const diagnostics: Record<string, any> = {
    status: "checking",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
    mongodb: {
      uri_set: false,
      uri_length: 0,
      uri_prefix: "",
      uri_is_atlas: false,
      uri_is_local: false,
      connection_state: "disconnected",
      error: null as string | null,
    },
  };

  // Check if MONGODB_URI is set and real
  const isPlaceholder =
    !uri ||
    uri.includes("cluster0.example") ||
    uri.includes("YOUR_MONGODB") ||
    uri.includes("placeholder");

  diagnostics.mongodb.uri_set = !isPlaceholder;
  diagnostics.mongodb.uri_length = uri.length;

  if (uri) {
    // Only show prefix for security (first 30 chars)
    diagnostics.mongodb.uri_prefix = uri.substring(0, 30) + "...";
    diagnostics.mongodb.uri_is_atlas = uri.startsWith("mongodb+srv://");
    diagnostics.mongodb.uri_is_local =
      uri.startsWith("mongodb://localhost") ||
      uri.startsWith("mongodb://127.0.0.1");
  }

  // Try to connect
  try {
    const { connectDB } = await import("@/lib/mongodb");
    const mongoose = await connectDB();
    diagnostics.mongodb.connection_state = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    diagnostics.status = "healthy";

    // Try a simple query
    const { User } = await import("@/models");
    const userCount = await User.countDocuments();
    const { Party } = await import("@/models");
    const partyCount = await Party.countDocuments();
    diagnostics.mongodb.user_count = userCount;
    diagnostics.mongodb.party_count = partyCount;
  } catch (error: any) {
    diagnostics.status = "unhealthy";
    diagnostics.mongodb.connection_state = "error";
    diagnostics.mongodb.error = error.message;
  }

  const statusCode = diagnostics.status === "healthy" ? 200 : 503;
  return NextResponse.json(diagnostics, { status: statusCode });
}
