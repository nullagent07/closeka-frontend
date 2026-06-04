import "server-only";
import { db } from "@/db";
import { workspaces, workspaceMembers } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";

export async function getOrCreateWorkspaceForUser(opts: {
  clerkUserId: string;
  email?: string | null;
}) {
  const existing = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.clerkUserId, opts.clerkUserId))
    .limit(1);
  if (existing[0]) {
    const [ws] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, existing[0].workspaceId))
      .limit(1);
    return ws;
  }

  const [ws] = await db
    .insert(workspaces)
    .values({ name: "My Firm", plan: "trial" })
    .returning();
  if (!ws) throw new Error("Failed to create workspace");
  await db.insert(workspaceMembers).values({
    workspaceId: ws.id,
    clerkUserId: opts.clerkUserId,
    role: "owner",
    email: opts.email ?? null,
  });
  return ws;
}

export async function getPrimaryWorkspaceForUser(clerkUserId: string) {
  const [m] = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.clerkUserId, clerkUserId))
    .limit(1);
  if (!m) return null;
  const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, m.workspaceId)).limit(1);
  return ws ?? null;
}

export async function listWorkspacesForUser(clerkUserId: string) {
  return db
    .select({ workspace: workspaces, role: workspaceMembers.role })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.clerkUserId, clerkUserId));
}
