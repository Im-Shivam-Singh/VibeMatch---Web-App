import { NextResponse } from "next/server";

// GET /api/health — Health check + MongoDB connection diagnostics
// IMPORTANT: MONGODB_URI is read at request time, not import time.
// This ensures we always see the latest env var value on Vercel serverless.
export async function GET() {
  // Read ALL possible MongoDB env vars at request time
  const MONGODB_URI = process.env.MONGODB_URI || "";
  const MONGODB_URL = process.env.MONGODB_URL || "";
  const MONGO_URI = process.env.MONGO_URI || "";
  const MONGO_URL = process.env.MONGO_URL || "";
  const DATABASE_URL = process.env.DATABASE_URL || "";

  // Pick the best URI
  const uri =
    MONGODB_URI ||
    MONGODB_URL ||
    MONGO_URI ||
    MONGO_URL ||
    (DATABASE_URL && !DATABASE_URL.startsWith("file:") ? DATABASE_URL : "");

  const diagnostics: Record<string, any> = {
    status: "checking",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
    vercel_region: process.env.VERCEL_REGION || "unknown",
    mongodb: {
      // Check all possible env var names
      env_vars: {
        MONGODB_URI: {
          set: !!MONGODB_URI,
          length: MONGODB_URI.length,
          prefix: MONGODB_URI ? MONGODB_URI.substring(0, 25) + "..." : "",
          is_atlas: MONGODB_URI.startsWith("mongodb+srv://"),
        },
        MONGODB_URL: {
          set: !!MONGODB_URL,
          length: MONGODB_URL.length,
        },
        MONGO_URI: {
          set: !!MONGO_URI,
          length: MONGO_URI.length,
        },
        MONGO_URL: {
          set: !!MONGO_URL,
          length: MONGO_URL.length,
        },
        DATABASE_URL: {
          set: !!DATABASE_URL,
          length: DATABASE_URL.length,
          is_file: DATABASE_URL.startsWith("file:"),
        },
      },
      resolved_uri: {
        set: !!uri,
        length: uri.length,
        prefix: uri ? uri.substring(0, 25) + "..." : "",
        is_atlas: uri.startsWith("mongodb+srv://"),
        is_local:
          uri.startsWith("mongodb://localhost") ||
          uri.startsWith("mongodb://127.0.0.1"),
      },
      connection_state: "disconnected",
      error: null as string | null,
    },
    troubleshooting: null as string[] | null,
  };

  // Check if URI is a placeholder
  const isPlaceholder =
    !uri ||
    uri.includes("cluster0.example") ||
    uri.includes("YOUR_MONGODB") ||
    uri.includes("placeholder");

  if (isPlaceholder && process.env.NODE_ENV === "production") {
    diagnostics.troubleshooting = [
      "MONGODB_URI is not set or is a placeholder.",
      "Steps to fix:",
      "1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables",
      "2. Add a new variable with key: MONGODB_URI",
      "3. Set the value to your MongoDB Atlas connection string (mongodb+srv://...)",
      "4. Make sure it's enabled for ALL environments (Production, Preview, Development)",
      "5. Redeploy the project (Deployments → Redeploy)",
      "6. In MongoDB Atlas: Cluster → Connect → Connect your app → Copy connection string",
      "7. In MongoDB Atlas: Network Access → Add 0.0.0.0/0 to allow Vercel connections",
    ];
  }

  // Try to connect
  try {
    const { connectDB } = await import("@/lib/db/mongodb");
    const mongoose = await connectDB();
    diagnostics.mongodb.connection_state =
      mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    diagnostics.status = "healthy";

    // Try a simple query
    const { User } = await import("@/lib/db/models");
    const userCount = await User.countDocuments();
    const { Party } = await import("@/lib/db/models");
    const partyCount = await Party.countDocuments();
    diagnostics.mongodb.user_count = userCount;
    diagnostics.mongodb.party_count = partyCount;
    diagnostics.troubleshooting = null; // Clear troubleshooting if connected
  } catch (error: any) {
    diagnostics.status = "unhealthy";
    diagnostics.mongodb.connection_state = "error";
    diagnostics.mongodb.error = error.message;

    if (!diagnostics.troubleshooting) {
      diagnostics.troubleshooting = [
        "MongoDB connection failed: " + error.message,
        "Common fixes:",
        "1. Verify MONGODB_URI is set in Vercel Environment Variables",
        "2. Make sure MongoDB Atlas allows connections from 0.0.0.0/0 (Network Access)",
        "3. Check that your Atlas cluster is not paused (free clusters auto-pause)",
        "4. Verify username and password in the connection string",
        "5. Redeploy after adding/changing environment variables",
      ];
    }
  }

  const statusCode = diagnostics.status === "healthy" ? 200 : 503;
  return NextResponse.json(diagnostics, { status: statusCode });
}
