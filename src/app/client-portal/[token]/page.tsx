import { notFound } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { closePeriods, emailDrafts, questions } from "@/db/schema";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function verifyToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [periodId, sig] = parts;
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV === "production" ? null : periodId;
  }
  const expected = createHmac("sha256", secret).update(periodId).digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? periodId : null;
}

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const periodId = verifyToken(token);
  if (!periodId) notFound();

  const [period] = await db.select().from(closePeriods).where(eq(closePeriods.id, periodId));
  if (!period) notFound();

  const draftRows = await db
    .select()
    .from(emailDrafts)
    .where(eq(emailDrafts.closePeriodId, periodId));
  const draft = draftRows[0];

  const questionRows = draft?.questionSetId
    ? await db
        .select()
        .from(questions)
        .where(eq(questions.questionSetId, draft.questionSetId))
    : [];

  return (
    <main className="container max-w-2xl py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Monthly close</h1>
        <p className="text-sm text-muted-foreground">Period: {period.periodLabel}</p>
      </header>
      {draft ? (
        <Card className="p-6 space-y-4">
          <div>
            <div className="text-xs text-muted-foreground">Subject</div>
            <div className="font-medium">{draft.subject}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Message</div>
            <pre className="whitespace-pre-wrap font-sans text-sm mt-2">{draft.body}</pre>
          </div>
          {questionRows.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground">Questions</div>
              <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm">
                {questionRows
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((q) => (
                    <li key={q.id}>{q.prompt}</li>
                  ))}
              </ol>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Reply directly to this email with the requested documents and answers.
          </p>
        </Card>
      ) : (
        <Card className="p-6 text-sm text-muted-foreground">
          No draft has been prepared for this period yet.
        </Card>
      )}
    </main>
  );
}
