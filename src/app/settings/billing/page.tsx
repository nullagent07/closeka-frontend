import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { getOrCreateWorkspaceForUser } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "$99/mo",
    description: "Up to 25 clients · 1 user · email drafts",
  },
  {
    id: "growth",
    name: "Growth",
    price: "$199/mo",
    description: "Up to 75 clients · 5 users · AI escalation",
  },
  {
    id: "scale",
    name: "Scale",
    price: "$399/mo",
    description: "Up to 200 clients · 15 users · priority support",
  },
] as const;

export default async function BillingPage() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  const ws = await getOrCreateWorkspaceForUser({
    clerkUserId: userId,
    email: user?.emailAddresses?.[0]?.emailAddress ?? null,
  });

  return (
    <div className="container py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-muted-foreground">
          {ws.name} · current plan: {ws.plan}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.id} className="p-5 flex flex-col justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{p.name}</h2>
              <p className="text-2xl font-bold mt-1">{p.price}</p>
              <p className="text-sm text-muted-foreground mt-2">{p.description}</p>
            </div>
            <form action="/api/billing/checkout" method="post">
              <input type="hidden" name="priceId" value={p.id} />
              <Button className="w-full" type="submit">
                Choose {p.name}
              </Button>
            </form>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Checkout is processed by Stripe. Cancel anytime from this page.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard">Back</Link>
      </Button>
    </div>
  );
}
