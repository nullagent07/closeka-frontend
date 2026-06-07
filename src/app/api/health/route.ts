import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const env = serverEnv();
  const checks: Record<string, "ok" | "missing" | "invalid"> = {
    clerk: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_") ? "ok" : "invalid",
    supabase_url: env.NEXT_PUBLIC_SUPABASE_URL.startsWith("https://") ? "ok" : "invalid",
    supabase_anon: env.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith("eyJ") ? "ok" : "invalid",
    supabase_service: env.SUPABASE_SERVICE_ROLE_KEY ? (env.SUPABASE_SERVICE_ROLE_KEY.startsWith("eyJ") ? "ok" : "invalid") : "missing",
    postmark_token: env.POSTMARK_API_TOKEN ? "ok" : "missing",
    postmark_inbound: env.POSTMARK_INBOUND_SECRET ? "ok" : "missing",
    stripe_secret: env.STRIPE_SECRET_KEY ? (env.STRIPE_SECRET_KEY.startsWith("sk_") ? "ok" : "invalid") : "missing",
    stripe_webhook: env.STRIPE_WEBHOOK_SECRET ? (env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_") ? "ok" : "invalid") : "missing",
    cron_secret: env.CRON_SECRET ? "ok" : "missing",
    mistral: env.MISTRAL_API_KEY ? "ok" : "missing",
    anthropic: env.ANTHROPIC_API_KEY ? "ok" : "missing",
    openai: env.OPENAI_API_KEY ? "ok" : "missing",
  };

  const allOk = Object.values(checks).every((v) => v === "ok");
  const required: Array<keyof typeof checks> = ["clerk", "supabase_url", "supabase_anon"];
  const requiredOk = required.every((k) => checks[k] === "ok");

  return NextResponse.json(
    {
      ok: requiredOk,
      healthy: allOk,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: requiredOk ? 200 : 503 }
  );
}
