import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { getOrCreateWorkspaceForUser } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClientAction } from "./actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewClientPage() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  const ws = await getOrCreateWorkspaceForUser({
    clerkUserId: userId,
    email: user?.emailAddresses?.[0]?.emailAddress ?? null,
  });

  return (
    <div className="container max-w-xl py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New client</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/clients">Back</Link>
        </Button>
      </div>
      <Card className="p-6">
        <form action={createClientAction} className="space-y-4">
          <input type="hidden" name="workspaceId" value={ws.id} />
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Acme Industries"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="primaryContactEmail" className="text-sm font-medium">
              Primary contact email
            </label>
            <input
              id="primaryContactEmail"
              name="primaryContactEmail"
              type="email"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              placeholder="owner@acme.com"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="primaryContactName" className="text-sm font-medium">
              Primary contact name
            </label>
            <input
              id="primaryContactName"
              name="primaryContactName"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Alex Doe"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Industry, fiscal year, etc."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/clients">Cancel</Link>
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
