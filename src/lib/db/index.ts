import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type DB = NeonHttpDatabase<typeof schema>;

let cached: DB | null = null;

function getDb(): DB {
  if (cached) return cached;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.",
    );
  }
  // Neon's HTTP driver is stateless and perfect for Vercel serverless functions.
  cached = drizzle(neon(connectionString), { schema });
  return cached;
}

/**
 * Lazily-initialized Drizzle client. Using a proxy keeps the ergonomic `db.select()`
 * call sites while deferring the connection (and the env-var check) to runtime,
 * so `next build` never fails just because build-time env vars are absent.
 */
export const db = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
