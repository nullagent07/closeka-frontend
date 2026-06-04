import "server-only";
import { ServerClient } from "postmark";

let cached: ServerClient | null = null;

export function postmark(): ServerClient {
  if (cached) return cached;
  const apiKey = process.env.POSTMARK_API_TOKEN;
  if (!apiKey) throw new Error("POSTMARK_API_TOKEN is not set");
  cached = new ServerClient(apiKey);
  return cached;
}

export interface SendClientEmailInput {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  messageStream?: string;
  metadata?: Record<string, string>;
}

export async function sendClientEmail(input: SendClientEmailInput) {
  const from = process.env.POSTMARK_FROM_EMAIL;
  if (!from) throw new Error("POSTMARK_FROM_EMAIL is not set");
  return postmark().sendEmail({
    From: from,
    To: input.to,
    Subject: input.subject,
    HtmlBody: input.htmlBody,
    TextBody: input.textBody,
    MessageStream: input.messageStream ?? "outbound",
    Metadata: input.metadata,
  });
}
