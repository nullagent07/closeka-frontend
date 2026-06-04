import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { jobs } from "@/db/schema";

export type JobRow = typeof jobs.$inferSelect;
export type JobHandler = (job: JobRow) => Promise<void>;

const handlers: Record<string, JobHandler> = {};

export function registerJobHandler(kind: string, handler: JobHandler) {
  handlers[kind] = handler;
}

export async function drainJobs(limit = 10) {
  const now = new Date();
  const stale = new Date(now.getTime() - 5 * 60_000);
  await db
    .update(jobs)
    .set({ status: "pending", lockedAt: null, lockedBy: null, updatedAt: now })
    .where(eq(jobs.status, "running"));

  const claimed = await db
    .select()
    .from(jobs)
    .where(eq(jobs.status, "pending"))
    .orderBy(asc(jobs.runAt))
    .limit(limit);

  const processed: { id: string; ok: boolean; error?: string }[] = [];
  for (const job of claimed) {
    const lockId = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const [acquired] = await db
      .update(jobs)
      .set({ status: "running", lockedAt: now, lockedBy: lockId, updatedAt: now })
      .where(eq(jobs.id, job.id))
      .returning();
    if (!acquired) continue;

    const handler = handlers[job.kind];
    try {
      if (!handler) throw new Error(`No handler registered for job kind: ${job.kind}`);
      await handler(job);
      await db
        .update(jobs)
        .set({ status: "done", lockedAt: null, lockedBy: null, updatedAt: new Date() })
        .where(eq(jobs.id, job.id));
      processed.push({ id: job.id, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const nextAttempts = job.attempts + 1;
      const finalStatus = nextAttempts >= 3 ? "failed" : "pending";
      await db
        .update(jobs)
        .set({
          status: finalStatus,
          attempts: nextAttempts,
          lastError: message,
          lockedAt: null,
          lockedBy: null,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, job.id));
      processed.push({ id: job.id, ok: false, error: message });
    }
  }
  void stale;
  return { processed: processed.length, results: processed };
}
