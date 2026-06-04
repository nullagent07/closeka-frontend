import { notFound } from "next/navigation";
import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { closePeriods, clients, emailDrafts } from "@/db/schema";
import { getOrCreateWorkspaceForUser } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { approveAndSendAction } from "./actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DraftReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  await getOrCreateWorkspaceForUser({
    clerkUserId: userId,
    email: user?.emailAddresses?.[0]?.emailAddress ?? null,
  });
  const { id } = await params;
  const [draft] = await db.select().from(emailDrafts).where(eq(emailDrafts.id, id));
  if (!draft) notFound();
  const [period] = await db
    .select()
    .from(closePeriods)
    .where(eq(closePeriods.id, draft.closePeriodId));
  if (!period) notFound();
  const [client] = await db.select().from(clients).where(eq(clients.id, period.clientId));
  if (!client) notFound();

  return (
    <div className="container max-w-2xl py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Review draft</h1>
          <p className="text-sm text-muted-foreground">
            {client.name} · {period.periodLabel}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/clients/${client.id}/close/${period.id}`}>Back</Link>
        </Button>
      </div>

      <Card className="p-4">
        <div className="text-xs text-muted-foreground">Subject</div>
        <div className="font-medium">{draft.subject}</div>
      </Card>

      <Card className="p-4">
        <div className="text-xs text-muted-foreground">Body</div>
        <pre className="whitespace-pre-wrap font-sans text-sm mt-2">{draft.body}</pre>
      </Card>

      <Card className="p-4 flex items-center justify-between">
        <div className="text-sm">
          {draft.approvedAt ? (
            <span className="text-green-600">Approved</span>
          ) : draft.sentAt ? (
            <span className="text-blue-600">Sent</span>
          ) : (
            <span className="text-muted-foreground">Awaiting approval</span>
          )}
        </div>
        {!draft.approvedAt && !draft.sentAt && (
          <form action={approveAndSendAction}>
            <input type="hidden" name="draftId" value={draft.id} />
            <Button type="submit" size="sm">
              Approve & send
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
