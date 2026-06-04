"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, workspaceMembers } from "@/db/schema";
import { getUserIdOrThrow } from "@/lib/auth-server";

const schema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(200),
  primaryContactEmail: z
    .string()
    .email()
    .max(254)
    .optional()
    .or(z.literal("")),
  primaryContactName: z.string().max(200).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

async function assertMembership(userId: string, workspaceId: string) {
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
}

export async function createClientAction(formData: FormData) {
  const userId = await getUserIdOrThrow();
  const parsed = schema.safeParse({
    workspaceId: formData.get("workspaceId"),
    name: formData.get("name"),
    primaryContactEmail: formData.get("primaryContactEmail") ?? "",
    primaryContactName: formData.get("primaryContactName") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  await assertMembership(userId, parsed.data.workspaceId);

  const [row] = await db
    .insert(clients)
    .values({
      workspaceId: parsed.data.workspaceId,
      name: parsed.data.name,
      primaryContactEmail: parsed.data.primaryContactEmail || null,
      primaryContactName: parsed.data.primaryContactName || null,
      notes: parsed.data.notes || null,
    })
    .returning({ id: clients.id });
  if (!row) throw new Error("Failed to create client");
  revalidatePath("/clients");
  redirect(`/clients/${row.id}`);
}
