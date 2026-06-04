import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { authErrorResponse, requireUser } from "@/lib/auth-server";

const schema = z.object({
  plan: z.enum(["starter", "growth", "scale"]),
});

const PLAN_TO_PRICE: Record<"starter" | "growth" | "scale", keyof typeof PRICE_ENV> = {
  starter: "STRIPE_PRICE_ID_STARTER",
  growth: "STRIPE_PRICE_ID_GROWTH",
  scale: "STRIPE_PRICE_ID_SCALE",
};

const PRICE_ENV = {
  STRIPE_PRICE_ID_STARTER: process.env.STRIPE_PRICE_ID_STARTER,
  STRIPE_PRICE_ID_GROWTH: process.env.STRIPE_PRICE_ID_GROWTH,
  STRIPE_PRICE_ID_SCALE: process.env.STRIPE_PRICE_ID_SCALE,
} as const;

export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch (e) {
    return authErrorResponse(e);
  }

  const raw = await req.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "plan required" }, { status: 400 });
  }

  const priceId = PRICE_ENV[PLAN_TO_PRICE[parsed.data.plan]];
  if (!priceId) {
    return NextResponse.json({ error: "Plan not configured" }, { status: 500 });
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/settings/billing?checkout=cancel`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
