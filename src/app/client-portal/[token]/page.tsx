import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { closePeriods, emailDrafts, questionSets, questions } from "@/db/schema";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // Token strategy: token = `${closePeriodId}.${hmacShort}`. For now accept just closePeriodId.
  const periodId = token.split(".")[0];
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
