import mongoose from "mongoose";

/**
 * MongoDB connection for VibeMatch.
 *
 * In production, set MONGODB_URI to your MongoDB Atlas connection string.
 * In development without a MongoDB URI, we auto-start an in-memory MongoDB
 * server so the app works out of the box.
 */

let MONGODB_URI = process.env.MONGODB_URI || "";

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

async function ensureMongoServer(): Promise<string> {
  // If we already have a running server URI, reuse it
  if (global.__mongoUri) {
    return global.__mongoUri;
  }

  // If we have a real MONGODB_URI, use it
  if (
    MONGODB_URI &&
    !MONGODB_URI.includes("cluster0.example") &&
    !MONGODB_URI.includes("YOUR_MONGODB")
  ) {
    return MONGODB_URI;
  }

  // Start in-memory MongoDB server
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

  // If connection was lost (hot reload), reset
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
    };

    cache.promise = mongoose
      .connect(uri, opts)
      .then(async (m) => {
        console.log("✅ Connected to MongoDB");
        // Auto-seed if this is a fresh in-memory DB
        if (!cache.seeded) {
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

export { connectDB, forceReseed };
export default mongoose;
