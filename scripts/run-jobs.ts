#!/usr/bin/env node
import "dotenv/config";
import { drainJobs } from "../src/lib/jobs";

async function main() {
  const claimed = await drainJobs(25);
  console.log(`claimed ${claimed.length} jobs`);
  for (const j of claimed) {
    console.log(` - ${j.kind} (${j.id}) payload=${JSON.stringify(j.payload)}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
