"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { clients } from "@/db/schema";

const schema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(200),
  primaryContactEmail: z.string().email().optional().or(z.literal("")),
  primaryContactName: z.string().max(200).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export async function createClientAction(formData: FormData) {
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
  revalidatePath("/clients");
  redirect(`/clients/${row.id}`);
}
