import mongoose from 'mongoose';
import config from './index.js';

// Cache the connection across hot-reloads / serverless invocations so every
// request reuses one connection instead of opening a new one (which causes
// "buffering timed out" errors when the pool is exhausted or cold).
let cached = globalThis._foodiqMongo;
if (!cached) {
  cached = globalThis._foodiqMongo = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 })
      .then((m) => m);
  }

  try {
    const m = await cached.promise;
    cached.conn = m;
    console.log(`MongoDB connected: ${m.connection.host}`);
    return cached.conn;
  } catch (error) {
    // Reset so the next request retries instead of hanging on a dead promise.
    cached.promise = null;
    console.error(`MongoDB connection error: ${error.message}`);
    // Fail fast locally so a bad MONGO_URI is loud; on hosting (Vercel)
    // throw and let the platform restart / surface the log instead.
    if (config.env !== 'production') process.exit(1);
    throw error;
  }
};

export default connectDB;
