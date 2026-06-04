import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, closePeriods } from "@/db/schema";
import { getOrCreateWorkspaceForUser } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  await getOrCreateWorkspaceForUser({
    clerkUserId: userId,
    email: user?.emailAddresses?.[0]?.emailAddress ?? null,
  });
  const { id } = await params;

  const [client] = await db.select().from(clients).where(eq(clients.id, id));
  if (!client) notFound();

  const periods = await db
    .select()
    .from(closePeriods)
    .where(eq(closePeriods.clientId, id))
    .orderBy(desc(closePeriods.createdAt));

  return (
    <div className="container py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{client.name}</h1>
          <p className="text-sm text-muted-foreground">
            {client.primaryContactEmail ?? "no contact email"}
          </p>
        </div>
        <Button asChild>
          <Link href={`/clients/${id}/close/new`}>New close period</Link>
        </Button>
      </div>

      <div className="grid gap-3">
        {periods.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No close periods yet. Create the first one to start tracking.
          </Card>
        ) : (
          periods.map((p) => (
            <Card key={p.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{p.periodLabel}</div>
                <div className="text-xs text-muted-foreground">
                  {p.periodStart.toISOString().slice(0, 10)} →{" "}
                  {p.periodEnd.toISOString().slice(0, 10)} · {p.status}
                </div>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={`/clients/${id}/close/${p.id}`}>Open</Link>
              </Button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
