import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.mongoose_uri;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined");
}

// Respect the database in the connection URI so local and test environments
// can use an isolated database. Keep the existing production database as the
// fallback for deployments whose URI does not include a database name.
const MONGODB_DB_NAME =
  process.env.MONGODB_DB_NAME ||
  (() => {
    const databaseName = new URL(MONGODB_URI).pathname.split("/").filter(Boolean)[0];
    return databaseName ? decodeURIComponent(databaseName) : "timesheet_portal";
  })();

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
  };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB_NAME,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
