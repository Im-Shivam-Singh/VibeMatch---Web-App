import mongoose from "mongoose";

/**
 * MongoDB connection for VibeMatch — optimized for Vercel serverless.
 *
 * Key design decisions for serverless:
 * 1. Uses globalThis for connection caching (survives module re-evaluation)
 * 2. minPoolSize=0 (serverless functions should not hold idle connections)
 * 3. Short serverSelectionTimeoutMS (fail fast in serverless)
 * 4. No auto-seed in production (prevents timeout on cold starts)
 * 5. Reads MONGODB_URI at runtime (not module load) for Vercel env var compat
 *
 * Vercel setup checklist:
 * ✅ Set MONGODB_URI in Vercel → Project → Settings → Environment Variables
 * ✅ Enable for ALL environments (Production, Preview, Development)
 * ✅ Redeploy after adding/changing env vars
 * ✅ MongoDB Atlas → Network Access → Add 0.0.0.0/0
 * ✅ URL-encode special chars in password (e.g. @ → %40, # → %23)
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

// Use globalThis for caching — survives hot reloads and serverless reuse
const cache: MongooseCache = globalThis.mongooseCache ?? {
  conn: null,
  promise: null,
  seeded: false,
};

if (!globalThis.mongooseCache) {
  globalThis.mongooseCache = cache;
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
  // Reuse running in-memory server if available
  if (globalThis.__mongoUri) {
    return globalThis.__mongoUri;
  }

  const MONGODB_URI = getMongoUri();

  // If we have a real MONGODB_URI, use it
  if (!isPlaceholderUri(MONGODB_URI)) {
    return MONGODB_URI;
  }

  // In production, we MUST have a real MongoDB URI
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "MONGODB_URI is required in production. " +
      "Add it in Vercel → Settings → Environment Variables. " +
      "Atlas Network Access must allow 0.0.0.0/0."
    );
  }

  // Start in-memory MongoDB server (dev only)
  console.log("[DB] Starting in-memory MongoDB...");
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mongod = await MongoMemoryServer.create({
    instance: { dbName: "vibematch" },
  });
  const uri = mongod.getUri();
  globalThis.__mongod = mongod;
  globalThis.__mongoUri = uri;
  console.log("[DB] In-memory MongoDB started:", uri);
  return uri;
}

async function connectDB(): Promise<typeof mongoose> {
  // Already connected — fast path
  if (mongoose.connection.readyState === 1 && cache.conn) {
    return cache.conn;
  }

  // Connection was lost — reset cache so we reconnect
  if (mongoose.connection.readyState === 0 && cache.conn) {
    cache.promise = null;
    cache.conn = null;
  }

  if (!cache.promise) {
    const uri = await ensureMongoServer();

    const isProd = process.env.NODE_ENV === "production";

    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      // Serverless-optimized timeouts
      serverSelectionTimeoutMS: isProd ? 5000 : 10000,
      connectTimeoutMS: isProd ? 8000 : 15000,
      socketTimeoutMS: isProd ? 20000 : 30000,
      // CRITICAL for serverless: minPoolSize=0 so idle connections are released
      maxPoolSize: isProd ? 8 : 10,
      minPoolSize: 0,
      // Allow serverless to reclaim connections
      maxIdleTimeMS: 15000,
    };

    cache.promise = mongoose
      .connect(uri, opts)
      .then(async (m) => {
        console.log("[DB] Connected to MongoDB");
        // Auto-seed only for dev in-memory DBs
        if (!cache.seeded && !isProd) {
          try {
            const { autoSeed } = await import("./auto-seed");
            await autoSeed();
            cache.seeded = true;
          } catch (e: any) {
            console.warn("[DB] Auto-seed skipped:", e.message);
          }
        }
        return m;
      })
      .catch((err) => {
        cache.promise = null;
        cache.conn = null;
        console.error("[DB] Connection error:", err.message);

        if (err.name === "MongoServerSelectionError") {
          console.error(
            "[DB] Server selection timeout. Check:\n" +
            "  1. Atlas Network Access → 0.0.0.0/0\n" +
            "  2. Connection string is correct\n" +
            "  3. Cluster is not paused"
          );
        } else if (err.message.includes("bad auth") || err.message.includes("authentication failed")) {
          console.error(
            "[DB] Auth failed. URL-encode special chars in password: @→%40 #→%23"
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

/** Force a re-seed of the database (dev only). */
async function forceReseed(): Promise<void> {
  cache.seeded = false;
  const { autoSeed } = await import("./auto-seed");
  await autoSeed();
  cache.seeded = true;
}

/**
 * Wrapper for API route handlers that ensures MongoDB connection
 * and returns proper error responses if the connection fails.
 */
function withDB(handler: (...args: any[]) => Promise<Response>): (...args: any[]) => Promise<Response> {
  return async (...args: any[]) => {
    try {
      await connectDB();
      return await handler(...args);
    } catch (error: any) {
      console.error("[API Error]", error.message);

      const isDbError =
        error.message.includes("MONGODB_URI") ||
        error.message.includes("MongoServerSelectionError") ||
        error.message.includes("MongoNetworkError") ||
        error.name === "MongooseError" ||
        error.name === "MongoServerError" ||
        error.name === "MongoError";

      if (isDbError) {
        return new Response(
          JSON.stringify({
            error: "Database connection failed",
            details: error.message,
            hint: "Check MONGODB_URI env var and Atlas Network Access (0.0.0.0/0)",
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
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
