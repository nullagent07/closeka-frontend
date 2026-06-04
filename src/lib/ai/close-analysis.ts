import "server-only";
import { z } from "zod";

const blockerSchema = z.object({
  title: z.string().min(1),
  detail: z.string().default(""),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
});

const questionSchema = z.object({
  prompt: z.string().min(1),
});

const analysisSchema = z.object({
  blockers: z.array(blockerSchema).default([]),
  questions: z.array(questionSchema).min(1).max(8),
  emailSubject: z.string().min(1),
  emailBody: z.string().min(1),
});

export type CloseAnalysis = z.infer<typeof analysisSchema>;

export interface AnalyzeCloseInput {
  clientName: string;
  periodLabel: string;
  checklist: { title: string; status: string; dueAt?: string | null }[];
  documents: { filename: string; extracted?: unknown }[];
}

const systemPrompt = `You are Closeka, an AI copilot for accounting and bookkeeping firms running monthly close.
You identify missing information, blockers, and risks. You NEVER send anything yourself.
You output STRICT JSON only, no prose, no markdown fences.`;

function buildUserPrompt(input: AnalyzeCloseInput) {
  return `Client: ${input.clientName}
Close period: ${input.periodLabel}

Checklist items (title | status | dueAt):
${input.checklist.map((c) => `- ${c.title} | ${c.status} | ${c.dueAt ?? ""}`).join("\n")}

Documents on file:
${input.documents.map((d) => `- ${d.filename}`).join("\n")}

Output JSON with this exact shape:
{
  "blockers": [{ "title": string, "detail": string, "severity": "low" | "medium" | "high" }],
  "questions": [{ "prompt": string }],
  "emailSubject": string,
  "emailBody": string
}

Guidelines:
- Blockers: things that are objectively missing or overdue (e.g. "Bank statement for Chase ****1234 not received").
- Questions: polite, specific, actionable asks to the client, max 8.
- emailSubject: short and human, no "Re:".
- emailBody: friendly, professional, references the period, lists the open items clearly, signed by the firm. No marketing.
- All questions should be answerable by the client without accountant-side tools.`;
}

export async function analyzeClose(
  input: AnalyzeCloseInput,
  driver = getDefaultLlmFn(),
): Promise<CloseAnalysis> {
  const completion = await driver.complete(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildUserPrompt(input) },
    ],
    { json: true, temperature: 0.2, maxOutputTokens: 2048 },
  );
  const parsed = analysisSchema.safeParse(JSON.parse(completion.text));
  if (!parsed.success) {
    throw new Error(`LLM returned invalid JSON: ${parsed.error.message}`);
  }
  return parsed.data;
}

function getDefaultLlmFn() {
  const { getDefaultLlm } = require("../llm") as typeof import("../llm");
  return getDefaultLlm();
}
