import { NextResponse } from "next/server";

// GET /api/health — Health check + MongoDB connection diagnostics
export async function GET() {
  const diagnostics: Record<string, any> = {
    status: "checking",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
    mongodb: {
      uri_set: false,
      uri_prefix: "",
      connection_state: "disconnected",
      error: null as string | null,
    },
  };

  // Check if MONGODB_URI is set
  const uri = process.env.MONGODB_URI || "";
  diagnostics.mongodb.uri_set = !!uri && !uri.includes("cluster0.example") && !uri.includes("YOUR_MONGODB");
  if (uri) {
    // Only show prefix for security
    diagnostics.mongodb.uri_prefix = uri.substring(0, 25) + "...";
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
