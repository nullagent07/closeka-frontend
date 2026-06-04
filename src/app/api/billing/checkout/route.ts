import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { requireUser } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch (e) {
    return e as NextResponse;
  }

  const { priceId } = (await req.json()) as { priceId: string };
  if (!priceId) return NextResponse.json({ error: "priceId required" }, { status: 400 });

  const origin = req.headers.get("origin") ?? "http://localhost:3000";
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/settings/billing?checkout=cancel`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
