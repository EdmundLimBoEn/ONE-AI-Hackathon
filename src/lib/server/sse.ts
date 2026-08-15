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
  textStream: ReadableStream<string> | null,
  sources: SearchResult[],
  localText?: string,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encodeSse("metadata", { sources }));
      try {
        if (textStream) {
          const reader = textStream.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(encodeSse("delta", { text: value }));
          }
        } else if (localText) {
          controller.enqueue(encodeSse("delta", { text: localText }));
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

export const SSE_HEADERS: HeadersInit = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Content-Type-Options": "nosniff",
};
