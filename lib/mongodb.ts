import mongoose from 'mongoose';

// Define the MongoDB connection URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

// Define TypeScript interface for the cached connection
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend the global namespace to include our mongoose cache
declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

// Initialize the cache object
// In development, use a global variable to preserve the connection across hot reloads
let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

/**
 * Establishes a cached Mongoose connection and reuses it across calls.
 *
 * Reuses an existing connection when available; otherwise creates and caches a new connection suitable for development hot reloads and serverless environments.
 *
 * @returns The connected Mongoose instance.
 * @throws Any error encountered while establishing the connection.
 */
async function connectDB(): Promise<typeof mongoose> {
  // Return existing connection if available
  if (cached.conn) {
    return cached.conn;
  }

  // Create new connection promise if one doesn't exist
  if (!cached.promise) {
    const options = {
      bufferCommands: false, // Disable mongoose buffering in serverless environments
    };

    cached.promise = mongoose.connect(MONGODB_URI!, options).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    // Await the connection promise and cache the result
    cached.conn = await cached.promise;
  } catch (error) {
    // Clear the promise on error to allow retry on next call
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default connectDB;