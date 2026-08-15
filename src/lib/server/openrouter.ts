import { ApiError } from "./errors";
import type { ChatMessage } from "./prompts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODELS = ["nvidia/nemotron-3-nano-30b-a3b:free", "openrouter/free"] as const;
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_MODEL_RESPONSE_BYTES = 512_000;
const DEFAULT_MAX_TOKENS = 1_200;
const MAX_STREAM_OUTPUT_CHARACTERS = 16_000;

export interface OpenRouterOptions {
  privacy?: "standard" | "no-storage";
  maxTokens?: number;
}

export function buildOpenRouterRequestBody(
  model: string,
  messages: ChatMessage[],
  stream: boolean,
  jsonMode: boolean,
  options: OpenRouterOptions = {},
): Record<string, unknown> {
  const maxTokens = Math.max(1, Math.min(options.maxTokens ?? DEFAULT_MAX_TOKENS, 2_000));
  return {
    model,
    messages,
    stream,
    temperature: 0.15,
    max_tokens: maxTokens,
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    ...(options.privacy === "no-storage"
      ? { provider: { data_collection: "deny", zdr: true } }
      : {}),
  };
}

function requestHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "X-Title": "Singapore Law Atlas",
  };
}

async function requestModel(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  stream: boolean,
  jsonMode: boolean,
  options: OpenRouterOptions,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: requestHeaders(apiKey),
      body: JSON.stringify(buildOpenRouterRequestBody(model, messages, stream, jsonMode, options)),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(504, "model_timeout", "The language model timed out.");
    }
    throw new ApiError(502, "model_unavailable", "The language model is unavailable.");
  } finally {
    clearTimeout(timeoutId);
  }
}

async function firstSuccessfulResponse(
  apiKey: string,
  messages: ChatMessage[],
  stream: boolean,
  jsonMode: boolean,
  options: OpenRouterOptions,
): Promise<Response> {
  for (const model of MODELS) {
    const response = await requestModel(apiKey, model, messages, stream, jsonMode, options);
    if (response.ok) return response;
    const retryableStatus = [404, 408, 429, 502, 503, 504].includes(response.status);
    if (!retryableStatus && !(jsonMode && response.status === 400)) break;
  }
  throw new ApiError(502, "model_unavailable", "No language model is currently available.");
}

export function parseJsonObject<T>(content: string): T {
  const trimmed = content.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new ApiError(502, "invalid_model_response", "The language model returned invalid JSON.");
  }
  try {
    return JSON.parse(withoutFence.slice(firstBrace, lastBrace + 1)) as T;
  } catch {
    throw new ApiError(502, "invalid_model_response", "The language model returned invalid JSON.");
  }
}

async function readBoundedResponse(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_MODEL_RESPONSE_BYTES) {
    throw new ApiError(502, "invalid_model_response", "The language model response was too large.");
  }
  if (!response.body) {
    throw new ApiError(502, "invalid_model_response", "The language model returned no content.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const deadline = Date.now() + REQUEST_TIMEOUT_MS;
  let size = 0;
  let result = "";

  while (true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      await reader.cancel();
      throw new ApiError(504, "model_timeout", "The language model timed out.");
    }
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const chunk = await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new ApiError(504, "model_timeout", "The language model timed out.")),
            remaining,
          );
        }),
      ]);
      if (chunk.done) return result + decoder.decode();
      size += chunk.value.byteLength;
      if (size > MAX_MODEL_RESPONSE_BYTES) {
        await reader.cancel();
        throw new ApiError(502, "invalid_model_response", "The language model response was too large.");
      }
      result += decoder.decode(chunk.value, { stream: true });
    } catch (error) {
      await reader.cancel(error);
      throw error;
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  }
}

export async function completeJson<T>(
  apiKey: string,
  messages: ChatMessage[],
  options: OpenRouterOptions = {},
): Promise<T> {
  const response = await firstSuccessfulResponse(apiKey, messages, false, true, options);
  const responseText = await readBoundedResponse(response);

  let payload: {
    choices?: Array<{ message?: { content?: string } }>;
  };
  try {
    payload = JSON.parse(responseText) as typeof payload;
  } catch {
    throw new ApiError(502, "invalid_model_response", "The language model returned invalid data.");
  }
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new ApiError(502, "invalid_model_response", "The language model returned no content.");
  return parseJsonObject<T>(content);
}

export async function openChatStream(
  apiKey: string,
  messages: ChatMessage[],
  options: OpenRouterOptions = {},
): Promise<ReadableStream<Uint8Array>> {
  const response = await firstSuccessfulResponse(apiKey, messages, true, false, options);
  if (!response.body) throw new ApiError(502, "invalid_model_response", "The language model returned no stream.");
  return response.body;
}

export function decodeOpenRouterStream(body: ReadableStream<Uint8Array>): ReadableStream<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let emittedCharacters = 0;

  return new ReadableStream<string>({
    async pull(controller) {
      while (true) {
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new ApiError(504, "model_timeout", "The language model stream timed out.")),
            REQUEST_TIMEOUT_MS,
          );
        });
        let chunk: { done: boolean; value?: Uint8Array };
        try {
          chunk = await Promise.race([reader.read(), timeout]);
        } catch (error) {
          await reader.cancel(error);
          throw error;
        } finally {
          if (timeoutId !== undefined) clearTimeout(timeoutId);
        }
        const { done, value } = chunk;
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = done ? "" : (lines.pop() ?? "");

        for (const line of lines) {
          const payload = line.trim();
          if (!payload.startsWith("data:") || payload === "data: [DONE]") continue;
          try {
            const event = JSON.parse(payload.slice(5).trim()) as {
              choices?: Array<{ delta?: { content?: string } }>;
              error?: unknown;
            };
            if (event.error) {
              throw new ApiError(502, "model_stream_error", "The language model stream failed.");
            }
            const content = event.choices?.[0]?.delta?.content;
            if (content) {
              const remaining = MAX_STREAM_OUTPUT_CHARACTERS - emittedCharacters;
              if (remaining <= 0) {
                await reader.cancel("Output limit reached");
                controller.close();
                return;
              }
              const boundedContent = content.slice(0, remaining);
              controller.enqueue(boundedContent);
              emittedCharacters += boundedContent.length;
              if (boundedContent.length < content.length) {
                await reader.cancel("Output limit reached");
                controller.close();
                return;
              }
            }
          } catch (error) {
            if (error instanceof ApiError) throw error;
            // Ignore provider heartbeats or malformed individual chunks.
          }
        }

        if (done) {
          controller.close();
          return;
        }
        if (lines.length > 0) return;
      }
    },
    async cancel(reason) {
      await reader.cancel(reason);
    },
  });
}
