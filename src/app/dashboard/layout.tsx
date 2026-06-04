import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                CK
              </span>
              Closeka
            </Link>
            <nav className="flex items-center gap-1 text-sm text-muted-foreground">
              <Link href="/dashboard" className="rounded-md px-2 py-1 hover:bg-muted">
                Dashboard
              </Link>
              <Link href="/clients" className="rounded-md px-2 py-1 hover:bg-muted">
                Clients
              </Link>
              <Link href="/settings/billing" className="rounded-md px-2 py-1 hover:bg-muted">
                Billing
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="outline">
              <Link href="/clients/new">Add client</Link>
            </Button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
