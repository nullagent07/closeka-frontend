import { notFound } from "next/navigation";
import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { checklistItems, clients, closePeriods, emailDrafts } from "@/db/schema";
import { getOrCreateWorkspaceForUser } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ClosePeriodPage({
  params,
}: {
  params: Promise<{ id: string; periodId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  await getOrCreateWorkspaceForUser({
    clerkUserId: userId,
    email: user?.emailAddresses?.[0]?.emailAddress ?? null,
  });
  const { id, periodId } = await params;

  const [client] = await db.select().from(clients).where(eq(clients.id, id));
  if (!client) notFound();
  const [period] = await db.select().from(closePeriods).where(eq(closePeriods.id, periodId));
  if (!period) notFound();

  const items = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.closePeriodId, periodId))
    .orderBy(asc(checklistItems.orderIndex));

  const drafts = await db
    .select()
    .from(emailDrafts)
    .where(eq(emailDrafts.closePeriodId, periodId))
    .orderBy(desc(emailDrafts.createdAt));

  return (
    <div className="container py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {client.name} · {period.periodLabel}
          </h1>
          <p className="text-sm text-muted-foreground">Status: {period.status}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/clients/${id}`}>Back</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/drafts/new?periodId=${periodId}`}>Draft questions</Link>
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <h2 className="font-medium">Checklist</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-2">No items yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {items.map((it) => (
              <li key={it.id} className="flex justify-between">
                <span>{it.title}</span>
                <span className="text-muted-foreground">{it.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-medium">Email drafts</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-2">No drafts yet.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {drafts.map((d) => (
              <li key={d.id} className="flex items-center justify-between">
                <span>{d.subject}</span>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/drafts/${d.id}`}>Review</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
