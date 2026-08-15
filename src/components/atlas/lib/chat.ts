import type { SearchResult } from "@/lib/types";
import type { AtlasIndex } from "./atlas-data";
import { searchNodes } from "./search";

export type ChatRole = "user" | "assistant";

export interface ChatCitation {
  docId: string;
  title: string;
  citation: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  citations?: ChatCitation[];
  offline?: boolean;
}

export interface StreamHandlers {
  onDelta: (text: string) => void;
  onCitations: (citations: ChatCitation[]) => void;
}

interface StreamOptions extends StreamHandlers {
  messages: { role: ChatRole; content: string }[];
  docId?: string | null;
  signal: AbortSignal;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readDelta(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (!isRecord(payload)) return "";
  for (const key of ["delta", "text", "content", "response", "token"]) {
    const value = payload[key];
    if (typeof value === "string") return value;
  }
  // OpenAI-shaped chunks.
  const choices = payload.choices;
  if (Array.isArray(choices) && isRecord(choices[0])) {
    const choice = choices[0];
    if (isRecord(choice.delta) && typeof choice.delta.content === "string") {
      return choice.delta.content;
    }
    if (typeof choice.text === "string") return choice.text;
  }
  return "";
}

function readCitations(payload: unknown): ChatCitation[] | null {
  if (!isRecord(payload)) return null;
  const raw = payload.citations ?? payload.sources ?? payload.results;
  if (!Array.isArray(raw)) return null;
  const citations: ChatCitation[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const docId = typeof item.docId === "string" ? item.docId : typeof item.id === "string" ? item.id : null;
    if (!docId) continue;
    citations.push({
      docId,
      title: typeof item.title === "string" ? item.title : docId,
      citation: typeof item.citation === "string" ? item.citation : "",
    });
  }
  return citations.length > 0 ? citations : null;
}

function handleChunk(chunk: string, handlers: StreamHandlers): void {
  const trimmed = chunk.trim();
  if (!trimmed || trimmed === "[DONE]") return;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      const citations = readCitations(parsed);
      if (citations) handlers.onCitations(citations);
      // Ignore pure metadata frames (sources list) so they are not painted as text.
      const delta = readDelta(parsed);
      if (delta) handlers.onDelta(delta);
      else if (citations) return;
      else if (isRecord(parsed) && (parsed.sources || parsed.citations || parsed.type === "metadata")) {
        return;
      }
      return;
    } catch {
      // Not JSON after all — fall through and treat it as text.
    }
  }
  handlers.onDelta(chunk);
}

/**
 * Consumes /api/chat. Accepts a plain text stream, an SSE stream, or NDJSON,
 * because the answer service may be swapped underneath us.
 */
export async function streamChat(options: StreamOptions): Promise<boolean> {
  const { messages, docId, signal, onDelta, onCitations } = options;
  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages,
        docId,
        docIds: docId ? [docId] : [],
      }),
      signal,
    });
  } catch {
    return false;
  }

  if (!response.ok || !response.body) return false;

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const payload: unknown = await response.json();
      const citations = readCitations(payload);
      if (citations) onCitations(citations);
      const text =
        readDelta(payload) ||
        (isRecord(payload) && typeof payload.answer === "string" ? payload.answer : "");
      if (!text) return false;
      onDelta(text);
      return true;
    } catch {
      return false;
    }
  }

  const isSse = contentType.includes("event-stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let received = false;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      if (isSse) {
        const events = buffer.split(/\n\n/);
        buffer = events.pop() ?? "";
        for (const event of events) {
          for (const line of event.split("\n")) {
            if (!line.startsWith("data:")) continue;
            received = true;
            handleChunk(line.slice(5).trim(), { onDelta, onCitations });
          }
        }
      } else if (buffer.includes("\n") && buffer.trimStart().startsWith("{")) {
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          received = true;
          handleChunk(line, { onDelta, onCitations });
        }
      } else {
        received = true;
        onDelta(buffer);
        buffer = "";
      }
    }
    if (buffer.trim()) {
      received = true;
      handleChunk(buffer, { onDelta, onCitations });
    }
  } catch {
    return received;
  }

  return received;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Offline answer path: retrieval over the local index with a clearly-labelled,
 * non-generated summary, so the demo still shows grounded results if the
 * answer service is unavailable.
 */
export async function localAnswer(
  question: string,
  index: AtlasIndex,
  docId: string | null,
  handlers: StreamHandlers & { signal: AbortSignal },
): Promise<void> {
  const focus = docId ? index.docsById.get(docId) : null;
  const hits: SearchResult[] = searchNodes(index.docsById.values(), question, 4);
  const fallbackHits =
    hits.length > 0
      ? hits
      : [...index.docsById.values()]
          .sort((a, b) => b.degree - a.degree)
          .slice(0, 3)
          .map((node) => ({
            docId: node.id,
            title: node.title,
            citation: node.citation,
            excerpt: node.summary,
            score: node.degree,
          }));

  const lines: string[] = [];
  lines.push(
    "The answer service is offline, so this is a **retrieval-only** response drawn from the local index — no model output. Each authority is framed as a paper you can use on a live matter.",
  );
  if (focus) {
    lines.push(
      `\n\n**Focused paper** [[${focus.id}|${focus.title}]] (${focus.citation})\n\n` +
        `1. **What it is** — ${focus.court} decision on ${focus.categoryPath.join(" › ")}. ${focus.summary}\n` +
        `2. **How it is applicable** — match the user's facts against the issues tagged ${focus.tags.slice(0, 5).map((t) => t.replace(/-/g, " ")).join(", ") || "in the judgment"}.\n` +
        `3. **How it will be used** — open the full document for ratio, then cite ${focus.citation} for the holdings that survive on those facts.\n` +
        `4. **Precedents set** — use the summary and linked related authorities as the starting citation spine.`,
    );
  }
  lines.push("\n\n**Closest authorities in the atlas**\n\n");
  for (const hit of fallbackHits) {
    const node = index.docsById.get(hit.docId);
    lines.push(
      `- **What it is:** [[${hit.docId}|${hit.title}]] — ${hit.citation}. ` +
        `**Usable point:** ${node?.summary || hit.excerpt || "Open the document for the complete summary and statutory map."}\n`,
    );
  }
  lines.push(
    "\nFor each paper above, note how it applies to your facts, how you would deploy it (ratio / analogy / distinguish), and which statute sections the document flags.",
  );

  const text = lines.join("");
  for (let i = 0; i < text.length; i += 4) {
    if (handlers.signal.aborted) return;
    handlers.onDelta(text.slice(i, i + 4));
    if (i % 40 === 0) await sleep(8);
  }

  handlers.onCitations(
    fallbackHits.map((hit) => ({
      docId: hit.docId,
      title: hit.title,
      citation: hit.citation,
    })),
  );
}
