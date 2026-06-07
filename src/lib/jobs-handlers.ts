import "server-only";
import { db } from "@/db";
import {
  checklistItems,
  clients,
  closePeriods,
  documentExtractions,
  documents,
  emailDrafts,
  inboundMessages,
  questionSets,
  questions,
} from "@/db/schema";
import { and, eq, like, isNull } from "drizzle-orm";
import { registerJobHandler, type JobRow } from "./jobs";
import { sendClientEmail } from "./email";
import { analyzeClose } from "./ai/close-analysis";
import { ocrDocument, type OcrInput } from "./ai/ocr";
import { createSupabaseServiceClient } from "./supabase";

async function findClientByEmail(email: string | null) {
  if (!email) return null;
  const rows = await db.select().from(clients).where(like(clients.primaryContactEmail, email));
  return rows[0] ?? null;
}

const OCR_MIME_PREFIXES = ["image/", "application/pdf"];

function shouldOcr(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  return OCR_MIME_PREFIXES.some((p) => mimeType.startsWith(p));
}

async function downloadDocument(storagePath: string): Promise<Buffer> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage.from("documents").download(storagePath);
  if (error || !data) throw new Error(`Failed to download ${storagePath}: ${error?.message}`);
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function extractDocumentText(doc: typeof documents.$inferSelect): Promise<string | null> {
  if (!shouldOcr(doc.mimeType)) return null;

  const [cached] = await db
    .select()
    .from(documentExtractions)
    .where(eq(documentExtractions.documentId, doc.id));
  if (cached?.rawText) return cached.rawText;

  const buf = await downloadDocument(doc.storagePath);
  const ocrInput: OcrInput = {
    kind: "base64",
    base64: buf.toString("base64"),
    mimeType: doc.mimeType || "application/pdf",
  };
  const result = await ocrDocument(ocrInput);

  await db.insert(documentExtractions).values({
    documentId: doc.id,
    model: result.model,
    extractedJson: { pages: result.pages ?? null, source: "litellm-ocr" },
    rawText: result.text,
  });

  return result.text;
}

registerJobHandler("process_inbound_email", async (job: JobRow) => {
  const inboundId = (job.payload as { inboundMessageId?: string })?.inboundMessageId;
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
  const closePeriodId = (job.payload as { closePeriodId?: string })?.closePeriodId;
  if (!closePeriodId) throw new Error("closePeriodId missing");
  const [period] = await db.select().from(closePeriods).where(eq(closePeriods.id, closePeriodId));
  if (!period) throw new Error("close period not found");

  const [client] = await db.select().from(clients).where(eq(clients.id, period.clientId));
  const items = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.closePeriodId, period.id));
  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.closePeriodId, period.id));

  const docInputs: { filename: string; extracted?: string }[] = [];
  for (const doc of docs) {
    try {
      const text = await extractDocumentText(doc);
      docInputs.push({ filename: doc.filename, extracted: text ?? undefined });
    } catch (e) {
      docInputs.push({ filename: doc.filename, extracted: `[OCR failed: ${(e as Error).message}]` });
    }
  }

  const analysis = await analyzeClose({
    clientName: client?.name ?? "(unknown)",
    periodLabel: period.periodLabel,
    checklist: items.map((c) => ({
      title: c.title,
      status: c.status,
      dueAt: c.dueAt?.toISOString() ?? null,
    })),
    documents: docInputs,
  });

  const model = process.env.LITELLM_MODEL_SMALL || "mistral-small-latest";
  const [qs] = await db
    .insert(questionSets)
    .values({ closePeriodId: period.id, model })
    .returning({ id: questionSets.id });

  if (qs) {
    if (analysis.questions?.length) {
      await db.insert(questions).values(
        analysis.questions.map((q, i) => ({
          questionSetId: qs.id,
          prompt: q.prompt,
          orderIndex: i,
        })),
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

export {};
