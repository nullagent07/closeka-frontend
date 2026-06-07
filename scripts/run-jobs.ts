#!/usr/bin/env node
import { drainJobs } from "../src/lib/jobs";
import "../src/lib/jobs-handlers";

async function main() {
  const result = await drainJobs(25);
  console.log(`processed ${result.processed} jobs`);
  for (const r of result.results) {
    console.log(` - ${r.ok ? "ok" : "fail"} ${r.id}${r.error ? ` err=${r.error}` : ""}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
