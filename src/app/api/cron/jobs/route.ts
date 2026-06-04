import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { and, asc, eq, isNull, lte, or, sql } from "drizzle-orm";

const MAX_ATTEMPTS = 5;
const LOCK_KEY = "cron-processor";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const now = new Date();
  const stale = new Date(now.getTime() - 5 * 60_000);

  const claimed = await db
    .update(jobs)
    .set({
      status: "running",
      lockedAt: now,
      lockedBy: LOCK_KEY,
      updatedAt: now,
    })
    .where(
      and(
        eq(jobs.status, "pending"),
        lte(jobs.runAt, now),
        or(isNull(jobs.lockedAt), lte(jobs.lockedAt, stale)),
      ),
    )
    .returning();

  if (claimed.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const ids = claimed.map((j) => j.id);
  await db
    .update(jobs)
    .set({
      status: "done",
      updatedAt: new Date(),
    })
    .where(sql`${jobs.id} = ANY(${ids})`);

  return NextResponse.json({ processed: claimed.length, ids });
}

export const POST = GET;
export const config = { runtime: "nodejs" };
