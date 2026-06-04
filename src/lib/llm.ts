import "server-only";

type Role = "system" | "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
}

interface LlmOptions {
  temperature?: number;
  maxOutputTokens?: number;
  json?: boolean;
}

export interface LlmCompletion {
  text: string;
  model: string;
  provider: "mistral" | "anthropic" | "openai";
  tokensIn: number;
  tokensOut: number;
}

interface LlmDriver {
  name: LlmCompletion["provider"];
  model: string;
  complete: (messages: ChatMessage[], opts: LlmOptions) => Promise<LlmCompletion>;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function mistralDriver(model: string): LlmDriver {
  return {
    name: "mistral",
    model,
    async complete(messages, opts) {
      const apiKey = requireEnv("MISTRAL_API_KEY");
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: opts.temperature ?? 0.2,
          max_tokens: opts.maxOutputTokens ?? 1024,
          response_format: opts.json ? { type: "json_object" } : undefined,
        }),
      });
      if (!res.ok) throw new Error(`Mistral error ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as {
        choices: { message: { content: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      return {
        text: json.choices[0]?.message?.content ?? "",
        model,
        provider: "mistral",
        tokensIn: json.usage?.prompt_tokens ?? 0,
        tokensOut: json.usage?.completion_tokens ?? 0,
      };
    },
  };
}

function anthropicDriver(model: string): LlmDriver {
  return {
    name: "anthropic",
    model,
    async complete(messages, opts) {
      const apiKey = requireEnv("ANTHROPIC_API_KEY");
      const system = messages.find((m) => m.role === "system")?.content;
      const rest = messages.filter((m) => m.role !== "system");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: opts.maxOutputTokens ?? 1024,
          temperature: opts.temperature ?? 0.2,
          system,
          messages: rest.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as {
        content: { type: string; text: string }[];
        usage: { input_tokens: number; output_tokens: number };
      };
      return {
        text: json.content.find((c) => c.type === "text")?.text ?? "",
        model,
        provider: "anthropic",
        tokensIn: json.usage.input_tokens,
        tokensOut: json.usage.output_tokens,
      };
    },
  };
}

function openaiDriver(model: string): LlmDriver {
  return {
    name: "openai",
    model,
    async complete(messages, opts) {
      const apiKey = requireEnv("OPENAI_API_KEY");
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: opts.temperature ?? 0.2,
          max_tokens: opts.maxOutputTokens ?? 1024,
          response_format: opts.json ? { type: "json_object" } : undefined,
        }),
      });
      if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as {
        choices: { message: { content: string } }[];
        usage: { prompt_tokens: number; completion_tokens: number };
      };
      return {
        text: json.choices[0]?.message?.content ?? "",
        model,
        provider: "openai",
        tokensIn: json.usage?.prompt_tokens ?? 0,
        tokensOut: json.usage?.completion_tokens ?? 0,
      };
    },
  };
}

export function getDefaultLlm(): LlmDriver {
  return mistralDriver(process.env.MISTRAL_MODEL_SMALL || "mistral-small-latest");
}

export function getEscalationLlm(): LlmDriver {
  if (process.env.ANTHROPIC_API_KEY) return anthropicDriver("claude-haiku-4-5");
  if (process.env.OPENAI_API_KEY) return openaiDriver("gpt-5.4-mini");
  return getDefaultLlm();
}
