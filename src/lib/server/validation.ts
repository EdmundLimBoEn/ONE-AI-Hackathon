import { ApiError } from "./errors";

export const MAX_JSON_BYTES = 130_000;
export const MAX_QUERY_LENGTH = 2_000;
export const MAX_DEPOSITION_LENGTH = 120_000;

const DOC_ID_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,127})$/;

export function isValidDocId(value: string): boolean {
  return DOC_ID_PATTERN.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedString(
  value: unknown,
  field: string,
  maximum: number,
  minimum = 1,
): string {
  if (typeof value !== "string") {
    throw new ApiError(400, "invalid_request", `${field} must be a string.`);
  }
  const normalized = value.trim();
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new ApiError(
      400,
      "invalid_request",
      `${field} must contain between ${minimum} and ${maximum} characters.`,
    );
  }
  return normalized;
}

function boundedTopK(value: unknown, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 20) {
    throw new ApiError(400, "invalid_request", "topK must be an integer from 1 to 20.");
  }
  return value as number;
}

export interface SearchInput {
  query: string;
  topK: number;
}

export function validateSearchInput(value: unknown): SearchInput {
  if (!isRecord(value)) throw new ApiError(400, "invalid_request", "A JSON object is required.");
  return {
    query: boundedString(value.query, "query", 500),
    topK: boundedTopK(value.topK, 8),
  };
}

export interface ChatInput {
  query: string;
  topK: number;
}

export function validateChatInput(value: unknown): ChatInput {
  if (!isRecord(value)) throw new ApiError(400, "invalid_request", "A JSON object is required.");

  let query = value.query ?? value.message;
  if (query === undefined && Array.isArray(value.messages)) {
    const latest = [...value.messages]
      .reverse()
      .find((message) => isRecord(message) && message.role === "user");
    query = latest && isRecord(latest) ? latest.content : undefined;
  }

  return {
    query: boundedString(query, "query", MAX_QUERY_LENGTH),
    topK: boundedTopK(value.topK, 6),
  };
}

export interface DepositionInput {
  text: string;
  filename?: string;
}

export function validateDepositionInput(value: unknown): DepositionInput {
  if (!isRecord(value)) throw new ApiError(400, "invalid_request", "A JSON object is required.");
  const filename = value.filename === undefined
    ? undefined
    : boundedString(value.filename, "filename", 200);
  return {
    text: boundedString(value.text, "text", MAX_DEPOSITION_LENGTH, 40),
    filename,
  };
}

async function readBoundedText(request: Request, maximumBytes: number): Promise<string> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new ApiError(413, "payload_too_large", `Request bodies are limited to ${maximumBytes} bytes.`);
  }
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximumBytes) {
      await reader.cancel();
      throw new ApiError(413, "payload_too_large", `Request bodies are limited to ${maximumBytes} bytes.`);
    }
    result += decoder.decode(value, { stream: true });
  }

  return result + decoder.decode();
}

export async function parseJsonBody(request: Request, maximumBytes = MAX_JSON_BYTES): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiError(415, "unsupported_media_type", "Content-Type must be application/json.");
  }

  const body = await readBoundedText(request, maximumBytes);
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new ApiError(400, "invalid_json", "The request body is not valid JSON.");
  }
}
