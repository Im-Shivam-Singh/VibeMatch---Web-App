import mongoose from "mongoose";

/**
 * MongoDB connection for VibeMatch.
 *
 * In production (Vercel), set MONGODB_URI to your MongoDB Atlas connection string.
 * In development without a MongoDB URI, we auto-start an in-memory MongoDB
 * server so the app works out of the box.
 *
 * IMPORTANT: MONGODB_URI is read at *runtime* inside ensureMongoServer(), not at
 * module load time. This ensures that Vercel serverless functions always see the
 * latest env var value even when the module is cached from a prior invocation.
 *
 * Vercel troubleshooting:
 * - Make sure MONGODB_URI is set in Vercel Project Settings → Environment Variables
 * - Make sure it's enabled for ALL environments (Production, Preview, Development)
 * - Redeploy after adding/changing environment variables
 * - The MongoDB Atlas cluster must allow connections from 0.0.0.0/0 (Network Access)
 */

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  seeded: boolean;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
  var __mongod: any;
  var __mongoUri: string | undefined;
}

const cache: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
  seeded: false,
};

if (!global.mongooseCache) {
  global.mongooseCache = cache;
}

const isPlaceholderUri = (uri: string) =>
  !uri ||
  uri.includes("cluster0.example") ||
  uri.includes("YOUR_MONGODB") ||
  uri.includes("placeholder");

/**
 * Get the MongoDB URI from environment variables.
 * Tries multiple env var names for compatibility.
 */
function getMongoUri(): string {
  // Try multiple env var names — Vercel users sometimes use different names
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGODB_URL ||
    process.env.MONGO_URI ||
    process.env.MONGO_URL ||
    process.env.DATABASE_URL ||
    "";

  // If DATABASE_URL is a SQLite/Prisma file path, skip it
  if (uri.startsWith("file:")) return "";

  return uri;
}

async function ensureMongoServer(): Promise<string> {
  // If we already have a running server URI, reuse it
  if (global.__mongoUri) {
    return global.__mongoUri;
  }

  // IMPORTANT: Read MONGODB_URI at *runtime*, not at module load time.
  // On Vercel (serverless), the env var may not be available during module
  // caching but is available when the function actually executes.
  const MONGODB_URI = getMongoUri();

  // Debug logging for Vercel (remove in production if desired)
  if (process.env.NODE_ENV === "production") {
    console.log("[MongoDB] Checking env vars:", {
      MONGODB_URI_set: !!process.env.MONGODB_URI,
      MONGODB_URI_len: (process.env.MONGODB_URI || "").length,
      MONGODB_URL_set: !!process.env.MONGODB_URL,
      MONGO_URI_set: !!process.env.MONGO_URI,
      DATABASE_URL_set: !!process.env.DATABASE_URL,
      resolved_len: MONGODB_URI.length,
    });
  }

  // If we have a real MONGODB_URI, use it
  if (!isPlaceholderUri(MONGODB_URI)) {
    return MONGODB_URI;
  }

  // In production (Vercel), we MUST have a real MongoDB URI
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "MONGODB_URI environment variable is required in production. " +
      "Set it to your MongoDB Atlas connection string in Vercel project settings. " +
      "Get a free cluster at https://www.mongodb.com/atlas\n" +
      "Troubleshooting:\n" +
      "1. Go to Vercel Dashboard → Project → Settings → Environment Variables\n" +
      "2. Add MONGODB_URI with your Atlas connection string\n" +
      "3. Make sure it's enabled for Production, Preview, and Development\n" +
      "4. Redeploy the project after adding the variable\n" +
      "5. In MongoDB Atlas, allow connections from 0.0.0.0/0 in Network Access"
    );
  }

  // Start in-memory MongoDB server (dev only)
  console.log("🔄 Starting in-memory MongoDB for development...");
  try {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create({
      instance: {
        dbName: "vibematch",
      },
    });
    const uri = mongod.getUri();
    global.__mongod = mongod;
    global.__mongoUri = uri;
    console.log("✅ In-memory MongoDB started:", uri);
    return uri;
  } catch (e: any) {
    console.error("❌ Failed to start in-memory MongoDB:", e.message);
    throw e;
  }
}

async function connectDB(): Promise<typeof mongoose> {
  // Check if already connected
  if (mongoose.connection.readyState === 1 && cache.conn) {
    return cache.conn;
  }

  // If connection was lost (hot reload / serverless cold start), reset
  if (mongoose.connection.readyState === 0) {
    cache.promise = null;
    cache.conn = null;
  }

  if (!cache.promise) {
    const uri = await ensureMongoServer();

    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 15000,
      // Important for Vercel serverless: these options help with connection stability
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 30000,
    };

    cache.promise = mongoose
      .connect(uri, opts)
      .then(async (m) => {
        console.log("✅ Connected to MongoDB");
        // Auto-seed if this is a fresh in-memory DB (dev only)
        if (!cache.seeded && process.env.NODE_ENV !== "production") {
          try {
            const { autoSeed } = await import("./auto-seed");
            await autoSeed();
            cache.seeded = true;
          } catch (e: any) {
            console.warn("⚠️ Auto-seed skipped:", e.message);
          }
        }
        return m;
      })
      .catch((err) => {
        cache.promise = null;
        cache.conn = null;
        console.error("❌ MongoDB connection error:", err.message);

        // Provide helpful error messages for common Vercel issues
        if (err.message.includes("ENOTFOUND")) {
          console.error(
            "💡 DNS resolution failed. Check your MongoDB Atlas cluster URL."
          );
        } else if (err.message.includes("ECONNREFUSED")) {
          console.error(
            "💡 Connection refused. Make sure your MongoDB Atlas cluster allows connections from 0.0.0.0/0."
          );
        } else if (
          err.message.includes("authentication failed") ||
          err.message.includes("bad auth")
        ) {
          console.error(
            "💡 Authentication failed. Check your MongoDB username and password in the connection string."
          );
        } else if (err.message.includes("SERVER_REQUIRES_AUTH")) {
          console.error(
            "💡 The server requires authentication. Check your MongoDB Atlas credentials."
          );
        } else if (err.name === "MongoServerSelectionError") {
          console.error(
            "💡 Server selection timeout. Common causes:\n" +
            "   1. MongoDB Atlas IP whitelist — add 0.0.0.0/0 in Network Access\n" +
            "   2. Wrong connection string — verify in Atlas → Connect\n" +
            "   3. Cluster is paused — free clusters auto-pause after inactivity"
          );
        }

        throw err;
      });
  }

  try {
    cache.conn = await cache.promise;
  } catch (e) {
    cache.promise = null;
    cache.conn = null;
    throw e;
  }

  return cache.conn;
}

/**
 * Force a re-seed of the database (useful for development).
 */
async function forceReseed(): Promise<void> {
  cache.seeded = false;
  const { autoSeed } = await import("./auto-seed");
  await autoSeed();
  cache.seeded = true;
}

/**
 * Wrapper for API route handlers that ensures MongoDB connection
 * and returns proper error responses if the connection fails.
 *
 * Supports both simple handlers `(req) => ...` and dynamic route handlers
 * `(req, context) => ...` where context contains `{ params }`.
 *
 * Usage:
 *   async function _GET(req: NextRequest) { ... }
 *   export const GET = withDB(_GET);
 *
 *   async function _GET(req, { params }) { ... }
 *   export const GET = withDB(_GET);
 */
function withDB(handler: (...args: any[]) => Promise<Response>): (...args: any[]) => Promise<Response> {
  return async (...args: any[]) => {
    try {
      await connectDB();
      return await handler(...args);
    } catch (error: any) {
      console.error("API Error:", error.message);

      // Check if it's a MongoDB connection error
      if (
        error.message.includes("MONGODB_URI") ||
        error.message.includes("MongoServerSelectionError") ||
        error.message.includes("MongoNetworkError") ||
        error.message.includes("connection") ||
        error.name === "MongooseError" ||
        error.name === "MongoServerError" ||
        error.name === "MongoError"
      ) {
        return new Response(
          JSON.stringify({
            error: "Database connection failed",
            details: error.message,
            hint: process.env.NODE_ENV === "production"
              ? "Make sure MONGODB_URI is set in Vercel environment variables and your MongoDB Atlas allows connections from 0.0.0.0/0"
              : "Check your MongoDB connection string",
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Other errors
      return new Response(
        JSON.stringify({
          error: error.message || "Internal server error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };
}

export { connectDB, forceReseed, withDB };
export default mongoose;
