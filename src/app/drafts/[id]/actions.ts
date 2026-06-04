"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { clients, closePeriods, emailDrafts, jobs } from "@/db/schema";
import { eq } from "drizzle-orm";

const schema = z.object({ draftId: z.string().uuid() });

export async function approveAndSendAction(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const parsed = schema.safeParse({ draftId: formData.get("draftId") });
  if (!parsed.success) throw new Error("Invalid input");
  const [draft] = await db.select().from(emailDrafts).where(eq(emailDrafts.id, parsed.data.draftId));
  if (!draft) throw new Error("Draft not found");
  if (draft.approvedAt) return;

  await db
    .update(emailDrafts)
    .set({ approvedAt: new Date(), approvedByClerkUserId: userId })
    .where(eq(emailDrafts.id, draft.id));

  const [period] = await db.select().from(closePeriods).where(eq(closePeriods.id, draft.closePeriodId));
  if (!period) return;
  const [client] = await db.select().from(clients).where(eq(clients.id, period.clientId));
  if (!client?.primaryContactEmail) return;

  await db.insert(jobs).values({
    kind: "send_reminder",
    payload: { emailDraftId: draft.id, to: client.primaryContactEmail },
    runAt: new Date(),
  });
  revalidatePath(`/drafts/${draft.id}`);
  redirect(`/drafts/${draft.id}`);
}
