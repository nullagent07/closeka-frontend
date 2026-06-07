#!/usr/bin/env node
// Apply migration + RLS via pg driver (no psql dependency)
import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

const REF = "xgdaijedjdcswmyebatr";
const HOST = "aws-0-eu-west-1.pooler.supabase.com";
const PORT = 5432; // session mode for DDL
const USER = `postgres.${REF}`;
const DATABASE = "postgres";

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/apply-migration.mjs <db_password>");
  process.exit(1);
}

const client = new pg.Client({
  host: HOST,
  port: PORT,
  user: USER,
  password,
  database: DATABASE,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

async function run() {
  await client.connect();
  console.log("Connected to", `${HOST}:${PORT} as ${USER}`);

  const migration = readFileSync(join(projectRoot, "drizzle/0000_glorious_maverick.sql"), "utf8");
  const rls = readFileSync(join(projectRoot, "supabase/rls.sql"), "utf8");

  console.log("\n== Step 1/3: Applying Drizzle migration ==");
  await client.query(migration);
  console.log("  migration applied");

  console.log("\n== Step 2/3: Applying RLS policies ==");
  await client.query(rls);
  console.log("  rls applied");

  console.log("\n== Step 3/3: Verifying schema ==");
  const { rows: cnt } = await client.query(
    "SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema='public'"
  );
  console.log(`  tables in 'public' schema: ${cnt[0].n}`);

  const { rows: tables } = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  );
  console.log("  list:");
  for (const t of tables) {
    console.log(`    - ${t.table_name}`);
  }

  const { rows: rlsCount } = await client.query(
    "SELECT COUNT(*)::int AS n FROM pg_tables WHERE schemaname='public' AND rowsecurity=true"
  );
  console.log(`  tables with RLS enabled: ${rlsCount[0].n}`);

  await client.end();
  console.log("\nDone.");
}

run().catch((e) => {
  console.error("FAIL:", e.message);
  console.error(e);
  process.exit(1);
});
