import "server-only";

export type OcrInput =
  | { kind: "url"; url: string; mimeType?: string }
  | { kind: "dataUrl"; dataUrl: string; mimeType: string }
  | { kind: "base64"; base64: string; mimeType: string };

export interface OcrResult {
  text: string;
  pages?: number;
  model: string;
  raw?: unknown;
}

function getBaseUrl(): string {
  return (process.env.LITELLM_BASE_URL || "https://litellm-production-33a41.up.railway.app").replace(/\/$/, "");
}

function getApiKey(): string {
  const v = process.env.LITELLM_API_KEY;
  if (!v) throw new Error("Missing env LITELLM_API_KEY");
  return v;
}

function getModel(): string {
  return process.env.LITELLM_MODEL_OCR || "mistral-ocr-latest";
}

function toDataUrl(input: OcrInput): string {
  if (input.kind === "dataUrl") return input.dataUrl;
  if (input.kind === "url") return input.url;
  return `data:${input.mimeType};base64,${input.base64}`;
}

export async function ocrDocument(input: OcrInput, signal?: AbortSignal): Promise<OcrResult> {
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();
  const model = getModel();
  const dataUrl = toDataUrl(input);

  const ocrPayload: Record<string, unknown> = {
    model,
    document: {
      type: "document_url",
      document_url: dataUrl,
    },
    include_image_base64: false,
  };

  const res = await fetch(`${baseUrl}/v1/ocr`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(ocrPayload),
    signal,
  });

  if (res.ok) {
    const json = (await res.json()) as {
      text?: string;
      pages?: number;
      model?: string;
      output?: { text?: string; pages?: number };
      [k: string]: unknown;
    };
    const text = json.text ?? json.output?.text ?? "";
    const pages = json.pages ?? json.output?.pages;
    return { text, pages, model: json.model ?? model, raw: json };
  }

  if (res.status === 404 || res.status === 405) {
    return await ocrViaChatFallback(dataUrl, model, apiKey, baseUrl, signal);
  }

  const errText = await res.text();
  throw new Error(`LiteLLM OCR error ${res.status}: ${errText.slice(0, 500)}`);
}

async function ocrViaChatFallback(
  dataUrl: string,
  model: string,
  apiKey: string,
  baseUrl: string,
  signal?: AbortSignal,
): Promise<OcrResult> {
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are an OCR engine. Extract all text from the document exactly as written. Preserve line breaks. Output plain text only, no commentary.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the text from this document." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      temperature: 0.0,
      max_tokens: 4096,
    }),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LiteLLM OCR fallback error ${res.status}: ${errText.slice(0, 500)}`);
  }
  const json = (await res.json()) as {
    choices: { message: { content: string | null } }[];
  };
  return { text: json.choices[0]?.message?.content ?? "", model };
}
