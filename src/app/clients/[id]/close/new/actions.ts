"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { closePeriods } from "@/db/schema";

const schema = z.object({
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid(),
  periodLabel: z.string().min(1).max(64),
  periodStart: z.string().min(8),
  periodEnd: z.string().min(8),
});

export async function createClosePeriodAction(formData: FormData) {
  const parsed = schema.safeParse({
    workspaceId: formData.get("workspaceId"),
    clientId: formData.get("clientId"),
    periodLabel: formData.get("periodLabel"),
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const [row] = await db
    .insert(closePeriods)
    .values({
      workspaceId: parsed.data.workspaceId,
      clientId: parsed.data.clientId,
      periodLabel: parsed.data.periodLabel,
      periodStart: new Date(parsed.data.periodStart),
      periodEnd: new Date(parsed.data.periodEnd),
    })
    .returning({ id: closePeriods.id });
  revalidatePath(`/clients/${parsed.data.clientId}`);
  redirect(`/clients/${parsed.data.clientId}/close/${row.id}`);
}
