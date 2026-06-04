import { z } from "zod";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, workspaceMembers } from "@/db/schema";
import { createSupabaseServiceClient } from "@/lib/supabase";

const schema = z.object({
  filename: z.string().min(1).max(300),
  contentType: z.string().min(1).max(200),
  clientId: z.string().uuid(),
  closePeriodId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const [client] = await db.select().from(clients).where(eq(clients.id, parsed.data.clientId));
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const membership = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, client.workspaceId))
    .limit(1);
  const isMember = membership.some((m) => m.role === "owner" || m.role === "member");
  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const safeName = parsed.data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${client.id}/${Date.now()}_${safeName}`;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create signed url" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: {
      path,
      token: data.token,
      signedUrl: data.signedUrl,
    },
  });
}
