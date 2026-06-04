"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, closePeriods, workspaceMembers } from "@/db/schema";
import { getUserIdOrThrow } from "@/lib/auth-server";

const schema = z.object({
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid(),
  periodLabel: z.string().min(1).max(64),
  periodStart: z.string().min(8),
  periodEnd: z.string().min(8),
});

async function assertWorkspaceAccess(userId: string, workspaceId: string, clientId: string) {
  const [m] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.clerkUserId, userId),
      ),
    )
    .limit(1);
  if (!m) throw new Error("Forbidden");
  const [c] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId)))
    .limit(1);
  if (!c) throw new Error("Client not found in workspace");
}

export async function createClosePeriodAction(formData: FormData) {
  const userId = await getUserIdOrThrow();
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
  await assertWorkspaceAccess(userId, parsed.data.workspaceId, parsed.data.clientId);

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
  if (!row) throw new Error("Failed to create close period");
  revalidatePath(`/clients/${parsed.data.clientId}`);
  redirect(`/clients/${parsed.data.clientId}/close/${row.id}`);
}
