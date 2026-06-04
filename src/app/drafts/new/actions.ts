"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { closePeriods, jobs } from "@/db/schema";
import { eq } from "drizzle-orm";

const schema = z.object({ closePeriodId: z.string().uuid() });

export async function generateDraftAction(formData: FormData) {
  const parsed = schema.safeParse({ closePeriodId: formData.get("closePeriodId") });
  if (!parsed.success) throw new Error("Invalid input");
  const [period] = await db
    .select()
    .from(closePeriods)
    .where(eq(closePeriods.id, parsed.data.closePeriodId));
  if (!period) throw new Error("Close period not found");
  await db.insert(jobs).values({
    kind: "analyze_close",
    payload: { closePeriodId: period.id },
    runAt: new Date(),
  });
  revalidatePath(`/clients/${period.clientId}/close/${period.id}`);
  redirect(`/clients/${period.clientId}/close/${period.id}`);
}
