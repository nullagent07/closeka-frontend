import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { filename, contentType, clientId, closePeriodId } = (await req.json()) as {
    filename: string;
    contentType: string;
    clientId: string;
    closePeriodId?: string;
  };

  if (!filename || !contentType || !clientId) {
    return NextResponse.json({ error: "filename, contentType, clientId required" }, { status: 400 });
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${clientId}/${Date.now()}_${safeName}`;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not create signed url" }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      path,
      token: data.token,
      signedUrl: data.signedUrl,
    },
  });
}
