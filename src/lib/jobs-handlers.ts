import { db } from "@/db";
import {
  clients,
  closePeriods,
  emailDrafts,
  inboundMessages,
  questionSets,
  questions,
} from "@/db/schema";
import { eq, like } from "drizzle-orm";
import { registerJobHandler, type JobRow } from "./jobs";
import { sendClientEmail } from "./email";
import { analyzeClose } from "./ai/close-analysis";

async function findClientByEmail(email: string | null) {
  if (!email) return null;
  const rows = await db.select().from(clients).where(like(clients.primaryContactEmail, email));
  return rows[0] ?? null;
}

registerJobHandler("process_inbound_email", async (job: JobRow) => {
  const inboundId = (job.payload as any)?.inboundMessageId as string | undefined;
  if (!inboundId) throw new Error("inboundMessageId missing");
  const [msg] = await db.select().from(inboundMessages).where(eq(inboundMessages.id, inboundId));
  if (!msg) throw new Error("inbound message not found");
  const client = await findClientByEmail(msg.fromEmail);
  if (client) {
    await db
      .update(inboundMessages)
      .set({ clientId: client.id })
      .where(eq(inboundMessages.id, msg.id));
  }
});

registerJobHandler("analyze_close", async (job: JobRow) => {
  const closePeriodId = (job.payload as any)?.closePeriodId as string | undefined;
  if (!closePeriodId) throw new Error("closePeriodId missing");
  const [period] = await db.select().from(closePeriods).where(eq(closePeriods.id, closePeriodId));
  if (!period) throw new Error("close period not found");

  const analysis = await analyzeClose({
    clientName: "",
    periodLabel: period.periodLabel,
    checklist: [],
    documents: [],
  });

  const [qs] = await db
    .insert(questionSets)
    .values({ closePeriodId: period.id, model: "mistral-small" })
    .returning({ id: questionSets.id });

  if (qs) {
    if (analysis.questions?.length) {
      await db.insert(questions).values(
        analysis.questions.map((q, i) => ({ questionSetId: qs.id, prompt: q.prompt, orderIndex: i })),
      );
    }
    await db.insert(emailDrafts).values({
      closePeriodId: period.id,
      questionSetId: qs.id,
      subject: analysis.emailSubject,
      body: analysis.emailBody,
    });
  }
});

registerJobHandler("send_reminder", async (job: JobRow) => {
  const { emailDraftId, to } = job.payload as { emailDraftId?: string; to?: string };
  if (!emailDraftId || !to) throw new Error("emailDraftId and to are required");
  const [draft] = await db.select().from(emailDrafts).where(eq(emailDrafts.id, emailDraftId));
  if (!draft) throw new Error("draft not found");
  if (!draft.approvedAt) throw new Error("draft not approved");
  await sendClientEmail({
    to,
    subject: draft.subject,
    htmlBody: draft.body,
    textBody: draft.body,
    metadata: { draftId: draft.id },
  });
});

export {}; // side-effect: handlers registered
