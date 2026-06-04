import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __closekaPgPool: Pool | undefined;
}

export const pool =
  globalThis.__closekaPgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL,
  });

if (process.env.NODE_ENV !== "production") globalThis.__closekaPgPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
