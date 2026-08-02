import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const sql = neon(url);
  return drizzle({ client: sql });
}
