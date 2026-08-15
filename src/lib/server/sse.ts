import type { SearchResult } from "@/lib/types";

const encoder = new TextEncoder();

export function encodeSse(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function localChatText(query: string, sources: SearchResult[]): string {
  if (!sources.length) {
    return "No matching local authorities were found. Connect the Cloudflare and OpenRouter bindings for corpus-backed analysis.";
  }
  const bullets = sources
    .map(
      (source) =>
        `- [[${source.docId}|${source.title}]] ${source.citation ? `(${source.citation})` : ""} — ${source.excerpt.slice(0, 160)}${source.excerpt.length > 160 ? "…" : ""}`,
    )
    .join("\n");
  return (
    `Local preview for “${query}” (retrieval only — not a model synthesis).\n\n` +
    `**Authorities at a glance**\n\n${bullets}\n\n` +
    `Open any wikilink above to read the paper. Connect OpenRouter for a full analytical answer. This is legal information, not legal advice.`
  );
}

export function createSseChatStream(
  text: string,
  sources: SearchResult[],
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encodeSse("metadata", { sources }));
      try {
        for (const chunk of chunkChatText(text)) {
          controller.enqueue(encodeSse("delta", { text: chunk }));
        }
        controller.enqueue(encodeSse("done", {}));
      } catch {
        controller.enqueue(
          encodeSse("error", { code: "stream_interrupted", message: "The response stream was interrupted." }),
        );
      } finally {
        controller.close();
      }
    },
  });
}

export function chunkChatText(text: string): string[] {
  return text.match(/[\s\S]{1,96}/g) ?? [text];
}

export const SSE_HEADERS: HeadersInit = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Content-Type-Options": "nosniff",
};
