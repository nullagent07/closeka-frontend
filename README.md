# Closeka — Frontend

Monthly close copilot for accounting and bookkeeping firms. Stop chasing clients for month-end close.

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Tailwind CSS v3** + shadcn-style primitives
- **Clerk** for auth
- **Supabase** for Postgres + Storage (with RLS) — service role for jobs
- **Postmark** for transactional + inbound email
- **Drizzle ORM** + `drizzle-kit` for schema/migrations
- **Mistral Small 4** as default LLM, **Claude Haiku 4.5** or **GPT-5.4 mini** as escalation
- **Stripe** for billing
- **Vercel Cron** + a Supabase `jobs` table as a lightweight durable job queue (no Trigger.dev on day one)

## Local development

```bash
pnpm install
cp .env.example .env.local
# fill in the env values, at minimum:
#   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
#   CLERK_SECRET_KEY
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY
#   POSTMARK_API_TOKEN, POSTMARK_FROM_EMAIL
#   MISTRAL_API_KEY
#   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
#   STRIPE_PRICE_ID_STARTER, STRIPE_PRICE_ID_FIRM, STRIPE_PRICE_ID_SCALE
#   CRON_SECRET
pnpm dev
```

## Database

```bash
# generate a migration from src/db/schema.ts
pnpm db:generate
# apply (requires DATABASE_URL or SUPABASE_DB_URL in env)
pnpm db:push
```

## Background jobs (no Trigger.dev)

We enqueue rows in `jobs`. Vercel Cron hits `/api/cron/jobs` every minute. Each tick:

1. Atomically claims pending jobs whose `runAt <= now()`.
2. Marks them `running` and stamps `lockedAt` + `lockedBy`.
3. After processing (or via a worker), sets them `done` / `failed` with `lastError`.

For local dev you can manually drain:

```bash
pnpm cron:process
```

## AI pipeline

`src/lib/ai/close-analysis.ts` runs the LLM against checklist + documents. The model returns strict JSON
with `blockers`, `questions`, `emailSubject`, `emailBody`. Nothing is sent without an explicit
`approvedAt` on `email_drafts`.

## Inbound email (Postmark)

Configure a Postmark inbound stream and point it at `/api/postmark/inbound`. We persist the raw payload
and enqueue a `process_inbound_email` job. Optionally set `POSTMARK_INBOUND_SECRET` and forward the
header `X-Inbound-Secret` to verify the source.

## Project structure

```
src/
  app/                Next.js App Router
    api/              Route handlers (uploads, billing, webhooks, cron, postmark)
    dashboard/        Authed dashboard shell + subroutes
    sign-in/ sign-up/ Clerk hosted pages
  components/         UI primitives + Providers
  db/                 Drizzle schema + connection
  lib/                Cross-cutting modules (auth, env, llm, ai, email, stripe, jobs, supabase, validators)
  middleware.ts       Clerk route protection
drizzle.config.ts     Drizzle Kit
scripts/              Local-only job/cron helpers
```

## Naming

The product name **Closeka** is a working brand. RDAP confirms `closeka.com` is unregistered; final
USPTO/EUIPO clearance is still required before public launch.
