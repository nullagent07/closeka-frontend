# Closeka — Frontend

Monthly close copilot for accounting and bookkeeping firms. Stop chasing clients for month-end close.

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Tailwind CSS v3** + shadcn-style primitives
- **Clerk** for auth
- **Supabase** for Postgres + Storage (with RLS) — service role for jobs
- **Postmark** for transactional + inbound email
- **Drizzle ORM** + `drizzle-kit` for schema/migrations
- **LiteLLM proxy** for all AI (LLM + OCR) — single endpoint that fronts Mistral Small, Claude Haiku 4.5, Mistral OCR
- Job handler `analyze_close` calls `analyzeClose()` (LLM) and `ocrDocument()` (Mistral OCR) for attached documents
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
#   LITELLM_BASE_URL, LITELLM_API_KEY  (proxy URL + virtual key)
#   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
#   STRIPE_PRICE_ID_STARTER, STRIPE_PRICE_ID_GROWTH, STRIPE_PRICE_ID_SCALE
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

## AI pipeline (LiteLLM proxy)

All AI requests go through a single LiteLLM proxy (`LITELLM_BASE_URL`). One virtual key
(`LITELLM_API_KEY`, must start with `sk-`) gives access to all configured models:

| Use | Env var | Default model |
|---|---|---|
| Default chat / analysis | `LITELLM_MODEL_SMALL` | `mistral-small-latest` |
| Escalation (when small isn't enough) | `LITELLM_MODEL_ESCALATION` | `claude-haiku-4-5` |
| Document OCR (PDF / image) | `LITELLM_MODEL_OCR` | `mistral-ocr-latest` |
| Generic completion | `LITELLM_MODEL_COMPLETION` | `mistral-small-latest` |

`src/lib/llm.ts` exposes `getDefaultLlm()`, `getEscalationLlm()`, `getOcrLlm()` — all return
OpenAI-compatible `LlmDriver` instances that POST to `${LITELLM_BASE_URL}/v1/chat/completions`.

`src/lib/ai/ocr.ts` posts to `${LITELLM_BASE_URL}/v1/ocr` (Mistral OCR passthrough) and falls
back to chat completions with image input if OCR is not available on the proxy.

The `analyze_close` job handler:
1. Resolves the client and period from the DB.
2. Loads the checklist.
3. For each attached document (PDF / image), downloads via the Supabase service-role client and runs OCR; results cached in `document_extractions.rawText`.
4. Calls `analyzeClose({clientName, periodLabel, checklist, documents})` — returns strict JSON with `blockers`, `questions`, `emailSubject`, `emailBody`.
5. Persists `question_sets`, `questions`, and `email_drafts`. Nothing is sent without an explicit `approvedAt`.

## Inbound email (Postmark)

Configure a Postmark inbound stream and point it at `/api/postmark/inbound`. We persist the raw payload
and enqueue a `process_inbound_email` job. Optionally set `POSTMARK_INBOUND_SECRET` and forward the
header `X-Inbound-Secret` to verify the source.

## Project structure

```
src/
  app/                Next.js App Router
    api/              Route handlers (uploads, billing, webhooks, cron, postmark)
    clients/          Authed client management (list, new, detail, close periods)
    client-portal/    Read-only magic link for clients (token = periodId)
    dashboard/        Authed dashboard shell
    drafts/           Draft generation, review, approve & send
    settings/         Billing (Stripe Checkout)
    sign-in/ sign-up/ Clerk hosted pages
  components/         UI primitives + Providers
  db/                 Drizzle schema + connection
  lib/                Cross-cutting modules (auth, env, llm, ai, email, stripe, jobs, supabase, validators, workspace)
  middleware.ts       Clerk route protection
drizzle.config.ts     Drizzle Kit
scripts/              Local-only job/cron helpers
vercel.json           Cron schedule (`/api/cron/jobs`)
```

## Pages

- `/` — marketing landing
- `/sign-in`, `/sign-up` — Clerk hosted auth
- `/dashboard` — workspace overview
- `/clients`, `/clients/new` — list and create clients
- `/clients/[id]` — client detail + close period list
- `/clients/[id]/close/new` — create close period
- `/clients/[id]/close/[periodId]` — checklist + drafts for a period
- `/drafts/new?periodId=…` — enqueue an `analyze_close` job
- `/drafts/[id]` — review a draft and approve & send
- `/client-portal/[token]` — read-only client view
- `/settings/billing` — pick a plan, opens Stripe Checkout

## Job handlers

Registered in `src/lib/jobs-handlers.ts`:

- `process_inbound_email` — match inbound Postmark message to a client and link it
- `analyze_close` — OCR attached documents, call LLM, persist `question_sets`/`questions`/`email_drafts`
- `send_reminder` — send an approved draft via Postmark

## Naming

The product name **Closeka** is a working brand. RDAP confirms `closeka.com` is unregistered; final
USPTO/EUIPO clearance is still required before public launch.
