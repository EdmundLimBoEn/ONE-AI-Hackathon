import { enrichmentSchema, type Enrichment } from "./types";

const DEFAULT_MODELS = [
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
];

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}

export async function callOpenRouter(
  prompt: string,
  options: { apiKey: string; models?: string[]; retries?: number },
): Promise<Enrichment> {
  const models = options.models?.length ? options.models : DEFAULT_MODELS;
  const retries = options.retries ?? 2;
  let lastError: unknown;
  for (const model of models) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://singapore-law-atlas.pages.dev",
            "X-Title": "Singapore Law Atlas",
          },
          body: JSON.stringify({
            model,
            temperature: 0.15,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: "You are a Singapore legal research assistant. Return only valid JSON. Do not invent facts or citations." },
              { role: "user", content: prompt },
            ],
          }),
        });
        if (!response.ok) throw new Error(`OpenRouter ${response.status} (${model})`);
        const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
        return enrichmentSchema.parse(extractJson(payload.choices?.[0]?.message?.content ?? ""));
      } catch (error) {
        lastError = error;
        if (attempt < retries) await Bun.sleep(750 * 2 ** attempt);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All OpenRouter models failed");
}

export { DEFAULT_MODELS };
