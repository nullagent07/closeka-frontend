import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { subscriptions, workspaces } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const relevantEvents = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Signature verification failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  if (!relevantEvents.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  const obj = event.data.object as {
    customer?: string;
    subscription?: string;
    id?: string;
  };

  const stripeCustomerId = obj.customer;
  const stripeSubscriptionId = obj.subscription ?? obj.id;
  if (!stripeCustomerId || !stripeSubscriptionId) {
    return NextResponse.json({ received: true });
  }

  const sub = await stripe().subscriptions.retrieve(stripeSubscriptionId as string);

  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.stripeCustomerId, stripeCustomerId))
    .limit(1);

  if (!ws) {
    return NextResponse.json({ received: true, note: "workspace not found" });
  }

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.workspaceId, ws.id),
        eq(subscriptions.stripeSubscriptionId, sub.id),
      ),
    );

  const data = {
    workspaceId: ws.id,
    stripeCustomerId: stripeCustomerId,
    stripeSubscriptionId: sub.id,
    priceId: sub.items.data[0]?.price.id ?? null,
    status: sub.status,
    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(subscriptions).set(data).where(eq(subscriptions.id, existing.id));
  } else {
    await db.insert(subscriptions).values(data);
  }

  return NextResponse.json({ received: true });
}
