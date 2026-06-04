import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Clock, Mail, Users } from "lucide-react";

export default function DashboardPage() {
  const stats = [
    { label: "Active clients", value: "—", hint: "Connect data to populate", icon: Users },
    { label: "Blocked closes", value: "—", hint: "Closures waiting on client", icon: AlertCircle },
    { label: "Overdue requests", value: "—", hint: "Awaiting client response", icon: Clock },
    { label: "Pending approvals", value: "—", hint: "AI drafts awaiting your review", icon: Mail },
  ];

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">A live view of what blocks your monthly close.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{s.value}</div>
              <CardDescription>{s.hint}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-10 rounded-xl border bg-card p-8 text-card-foreground">
        <h2 className="text-lg font-medium">Welcome to Closeka</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Add your first client, create a monthly close period, upload a document or forward an email to your
          Postmark inbound address, and Closeka will surface what&apos;s missing and draft the follow-up.
        </p>
      </div>
    </div>
  );
}
