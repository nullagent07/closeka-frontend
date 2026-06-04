import { Suspense } from "react";
import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getOrCreateWorkspaceForUser } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ClientsPage() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  const ws = await getOrCreateWorkspaceForUser({
    clerkUserId: userId,
    email: user?.emailAddresses?.[0]?.emailAddress ?? null,
  });

  const rows = await db
    .select()
    .from(clients)
    .where(eq(clients.workspaceId, ws.id))
    .orderBy(desc(clients.createdAt));

  return (
    <div className="container py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground">{ws.name}</p>
        </div>
        <Button asChild>
          <Link href="/clients/new">Add client</Link>
        </Button>
      </div>
      <Suspense>
        {rows.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No clients yet. Add your first one to start a close.
          </Card>
        ) : (
          <div className="grid gap-3">
            {rows.map((c) => (
              <Card key={c.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.primaryContactEmail ?? "no contact email"}
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/clients/${c.id}`}>Open</Link>
                </Button>
              </Card>
            ))}
          </div>
        )}
      </Suspense>
    </div>
  );
}
