import { z } from "zod";

const optionalMin = (min: number) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().min(min).optional());

const optional = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.string().optional()
);

const serverSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().or(z.literal("http://localhost:3000")),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Closeka"),

  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: optionalMin(1),

  POSTMARK_API_TOKEN: optionalMin(1),
  POSTMARK_FROM_EMAIL: z
    .string()
    .email()
    .or(z.literal(""))
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  POSTMARK_INBOUND_SECRET: optionalMin(8),

  STRIPE_SECRET_KEY: optionalMin(1),
  STRIPE_WEBHOOK_SECRET: optionalMin(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optionalMin(1),

  LITELLM_BASE_URL: z
    .string()
    .url()
    .default("https://litellm-production-33a41.up.railway.app"),
  LITELLM_API_KEY: optionalMin(1),
  LITELLM_MODEL_SMALL: z.string().default("deepseek/deepseek-v4-flash"),
  LITELLM_MODEL_ESCALATION: z
    .string()
    .default("openrouter/anthropic/claude-haiku-4.5"),
  LITELLM_MODEL_OCR: z.string().default("mistral/mistral-ocr-latest"),
  LITELLM_MODEL_COMPLETION: z.string().default("deepseek/deepseek-v4-flash"),

  CRON_SECRET: optionalMin(8),

  RESEND_API_KEY: optionalMin(1),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid server env:\n${issues}`);
  }
  cached = parsed.data;
  return parsed.data;
}
