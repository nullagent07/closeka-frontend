import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { closePeriods, jobs } from "@/db/schema";
import { getOrCreateWorkspaceForUser } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { generateDraftAction } from "./actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewDraftPage({
  searchParams,
}: {
  searchParams: Promise<{ periodId?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  const ws = await getOrCreateWorkspaceForUser({
    clerkUserId: userId,
    email: user?.emailAddresses?.[0]?.emailAddress ?? null,
  });
  const { periodId } = await searchParams;
  if (!periodId) {
    return (
      <div className="container py-10">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">No close period selected.</p>
        </Card>
      </div>
    );
  }
  const [period] = await db.select().from(closePeriods).where(eq(closePeriods.id, periodId));
  if (!period) {
    return (
      <div className="container py-10">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Close period not found.</p>
        </Card>
      </div>
    );
  }
  void ws;

  return (
    <div className="container max-w-xl py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Generate draft</h1>
      <Card className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Period: <strong>{period.periodLabel}</strong>
        </p>
        <form action={generateDraftAction} className="space-y-4">
          <input type="hidden" name="closePeriodId" value={periodId} />
          <Button type="submit">Enqueue analysis</Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Analysis runs in the background via the cron processor. The draft will appear on the
          close period page when ready.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href={`/clients/${period.clientId}/close/${periodId}`}>Back</Link>
        </Button>
      </Card>
    </div>
  );
}
