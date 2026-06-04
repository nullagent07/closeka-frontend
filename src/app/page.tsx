import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              CK
            </span>
            Closeka
          </div>
          <nav className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/sign-up">
                Start free <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="container py-24 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Built for bookkeeping and accounting firms
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Stop chasing clients for month-end close.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
          Closeka shows what&apos;s blocking every client&apos;s books, drafts the follow-up questions, and only
          sends after you approve. Your human review, AI speed.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/sign-up">
              Try Closeka free <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </section>

      <section className="container grid gap-6 pb-24 sm:grid-cols-3">
        {[
          {
            icon: CheckCircle2,
            title: "One dashboard per client",
            body: "See what is blocking every close, days overdue, and pending approvals in one view.",
          },
          {
            icon: Sparkles,
            title: "AI drafts, you approve",
            body: "Closeka prepares the follow-up questions and email. You stay in control before it sends.",
          },
          {
            icon: ShieldCheck,
            title: "Secure client portal",
            body: "Clients respond through a tokenized link. No new logins, no friction, full audit trail.",
          },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
            <f.icon className="h-5 w-5" />
            <h3 className="mt-4 font-medium">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
