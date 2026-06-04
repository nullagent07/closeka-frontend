import { NextResponse, type NextRequest } from "next/server";
import { postmark } from "@/lib/email";
import { db } from "@/db";
import { inboundMessages, jobs } from "@/db/schema";

function verifySecret(req: NextRequest) {
  const expected = process.env.POSTMARK_INBOUND_SECRET;
  if (!expected) return true;
  const got = req.headers.get("x-inbound-secret");
  return got === expected;
}

export async function POST(req: NextRequest) {
  if (!verifySecret(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const body = (await req.json()) as Record<string, unknown>;

  const from = (body.FromFull as { Email?: string } | undefined)?.Email ?? (body.From as string);
  const subject = (body.Subject as string) ?? null;
  const messageId = (body.MessageID as string) ?? null;

  const [inserted] = await db
    .insert(inboundMessages)
    .values({
      fromEmail: from ?? null,
      subject,
      rawPayload: body,
    })
    .returning({ id: inboundMessages.id });

  if (inserted && messageId) {
    await db.insert(jobs).values({
      kind: "process_inbound_email",
      payload: { inboundMessageId: inserted.id, postmarkMessageId: messageId },
      runAt: new Date(),
    });
  }

  return NextResponse.json({ received: true });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
