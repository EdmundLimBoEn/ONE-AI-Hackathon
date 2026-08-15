import type { SearchResult } from "@/lib/types";

const encoder = new TextEncoder();

export function encodeSse(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function localChatText(query: string, sources: SearchResult[]): string {
  if (!sources.length) {
    return "No matching local authorities were found. Connect the Cloudflare and OpenRouter bindings for corpus-backed analysis.";
  }
  const citations = sources.map((source) => `[${source.title} ${source.citation}]`).join("; ");
  return `Local preview mode found authorities relevant to “${query}”: ${citations}. Connect OpenRouter for a synthesized answer. This is legal information, not legal advice.`;
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
