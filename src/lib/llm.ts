import "server-only";

type Role = "system" | "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string | ChatContentPart[];
}

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface LlmOptions {
  temperature?: number;
  maxOutputTokens?: number;
  json?: boolean;
  signal?: AbortSignal;
}

export interface LlmCompletion {
  text: string;
  model: string;
  provider: string;
  tokensIn: number;
  tokensOut: number;
}

export interface LlmDriver {
  model: string;
  complete: (messages: ChatMessage[], opts?: LlmOptions) => Promise<LlmCompletion>;
}

interface OpenAIChatResponse {
  choices: { message: { content: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  model?: string;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function getBaseUrl(): string {
  return (process.env.LITELLM_BASE_URL || "https://litellm-production-33a41.up.railway.app").replace(/\/$/, "");
}

function getApiKey(): string {
  return requireEnv("LITELLM_API_KEY");
}

function isLikelyMistralOcrModel(model: string): boolean {
  return /ocr/i.test(model);
}

export function getLlm(model?: string): LlmDriver {
  const resolvedModel = model || process.env.LITELLM_MODEL_SMALL || "mistral-small-latest";
  return makeLiteLLMDriver(resolvedModel);
}

export function getDefaultLlm(): LlmDriver {
  return getLlm();
}

export function getEscalationLlm(): LlmDriver {
  const model = process.env.LITELLM_MODEL_ESCALATION || "claude-haiku-4-5";
  return getLlm(model);
}

export function getOcrLlm(): LlmDriver {
  const model = process.env.LITELLM_MODEL_OCR || "mistral-ocr-latest";
  return getLlm(model);
}

export function getCompletionModel(): LlmDriver {
  return getLlm(process.env.LITELLM_MODEL_COMPLETION || "mistral-small-latest");
}

function makeLiteLLMDriver(model: string): LlmDriver {
  return {
    model,
    async complete(messages, opts) {
      const apiKey = getApiKey();
      const baseUrl = getBaseUrl();
      const body: Record<string, unknown> = {
        model,
        messages,
        temperature: opts?.temperature ?? 0.2,
      };
      if (opts?.maxOutputTokens) body.max_tokens = opts.maxOutputTokens;
      else if (!isLikelyMistralOcrModel(model)) body.max_tokens = 1024;
      if (opts?.json) body.response_format = { type: "json_object" };

      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: opts?.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`LiteLLM error ${res.status} (${model}): ${text.slice(0, 500)}`);
      }

      const json = (await res.json()) as OpenAIChatResponse;
      const content = json.choices?.[0]?.message?.content ?? "";
      return {
        text: content,
        model: json.model ?? model,
        provider: "litellm",
        tokensIn: json.usage?.prompt_tokens ?? 0,
        tokensOut: json.usage?.completion_tokens ?? 0,
      };
    },
  };
}
