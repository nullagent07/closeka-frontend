import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { clients, closePeriods } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateWorkspaceForUser } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClosePeriodAction } from "./actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewClosePeriodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  const ws = await getOrCreateWorkspaceForUser({
    clerkUserId: userId,
    email: user?.emailAddresses?.[0]?.emailAddress ?? null,
  });
  const { id } = await params;
  const [client] = await db.select().from(clients).where(eq(clients.id, id));
  if (!client) notFound();
  void ws;

  const today = new Date();
  const firstOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const lastOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
  const periodLabel = `${firstOfMonth.toISOString().slice(0, 7)}`;

  return (
    <div className="container max-w-xl py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New close period</h1>
        <Button asChild variant="outline" size="sm">
          <Link href={`/clients/${id}`}>Back</Link>
        </Button>
      </div>
      <Card className="p-6">
        <form action={createClosePeriodAction} className="space-y-4">
          <input type="hidden" name="workspaceId" value={ws.id} />
          <input type="hidden" name="clientId" value={id} />
          <div className="space-y-1">
            <label htmlFor="periodLabel" className="text-sm font-medium">
              Period label
            </label>
            <input
              id="periodLabel"
              name="periodLabel"
              defaultValue={periodLabel}
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="periodStart" className="text-sm font-medium">
                Start
              </label>
              <input
                id="periodStart"
                name="periodStart"
                type="date"
                defaultValue={firstOfMonth.toISOString().slice(0, 10)}
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="periodEnd" className="text-sm font-medium">
                End
              </label>
              <input
                id="periodEnd"
                name="periodEnd"
                type="date"
                defaultValue={lastOfMonth.toISOString().slice(0, 10)}
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/clients/${id}`}>Cancel</Link>
            </Button>
            <Button type="submit" size="sm">
              Create
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
