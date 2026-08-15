import { describe, expect, test } from "bun:test";
import type { SearchResult } from "../../src/lib/types";
import {
  buildRagMessages,
  DEFAULT_RAG_SYSTEM_PROMPT,
  renderCitation,
} from "../../src/lib/server/prompts";
import { chunkChatText } from "../../src/lib/server/sse";
import {
  buildOpenRouterRequestBody,
  decodeOpenRouterStream,
  parseJsonObject,
} from "../../src/lib/server/openrouter";

const source: SearchResult = {
  docId: "spandeck-v-dsta-2007",
  title: "Spandeck Engineering v DSTA",
  citation: "[2007] SGCA 37",
  excerpt: "The court established a two-stage duty-of-care test.",
  score: 0.91,
};

describe("RAG prompt helpers", () => {
  test("renders exact linkable citation text", () => {
    expect(renderCitation(source)).toBe("[Spandeck Engineering v DSTA [2007] SGCA 37]");
  });

  test("includes source identity and guards against invented authorities", () => {
    const messages = buildRagMessages("What is the duty test?", [source]);
    expect(messages[0].content).toContain("Do not invent authorities");
    expect(messages[0].content).toContain("not a human");
    expect(messages[0].content).toContain("[[Document ID|short label]]");
    expect(messages[0].content).toContain("What it is");
    expect(messages[0].content).toContain("How it is applicable to our case");
    expect(messages[0].content).toContain("How it will be used");
    expect(messages[0].content).toContain("Precedents set");
    expect(messages[0].content).toBe(DEFAULT_RAG_SYSTEM_PROMPT);
    expect(messages[1].content).toContain("Document ID: spandeck-v-dsta-2007");
    expect(messages[1].content).toContain("[[spandeck-v-dsta-2007|");
    expect(messages[1].content).toContain("Wikilink (use this form in your answer)");
    expect(messages[1].content).toContain("paper to analyse");
  });

});

describe("model JSON parsing", () => {
  test("extracts fenced JSON without evaluating surrounding text", () => {
    expect(parseJsonObject<{ ok: boolean }>('```json\n{"ok":true}\n```')).toEqual({ ok: true });
  });

  test("rejects non-JSON output", () => {
    expect(() => parseJsonObject("not json")).toThrow();
  });
});

describe("OpenRouter request privacy", () => {
  test("requires no-collection and ZDR routing for sensitive requests", () => {
    const body = buildOpenRouterRequestBody(
      "openrouter/free",
      buildRagMessages("sensitive testimony", [source]),
      false,
      true,
      { privacy: "no-storage", maxTokens: 900 },
    );
    expect(body.provider).toEqual({ data_collection: "deny", zdr: true });
    expect(body.max_tokens).toBe(900);
  });

  test("always applies a bounded output budget", () => {
    const body = buildOpenRouterRequestBody("openrouter/free", [], true, false, {
      maxTokens: 99_999,
    });
    expect(body.max_tokens).toBe(2_000);
    expect(body).not.toHaveProperty("provider");
  });

  test("reserves output budget for the user-facing answer", () => {
    const body = buildOpenRouterRequestBody(
      "nvidia/nemotron-3-nano-30b-a3b:free",
      [{ role: "user", content: "Summarise the authorities." }],
      true,
      false,
    );
    expect(body.reasoning).toEqual({ effort: "none", exclude: true });
  });
});

describe("OpenRouter stream decoding", () => {
  test("reads through heartbeat-only chunks before answer content", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(": OPENROUTER PROCESSING\n\n"));
        controller.enqueue(
          encoder.encode(
            'data: {"choices":[{"delta":{"content":"Spandeck answer"}}]}\n\n',
          ),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    const reader = decodeOpenRouterStream(body).getReader();
    let result = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      result += chunk.value;
    }
    expect(result).toBe("Spandeck answer");
  });
});

test("completed model answers are split into streamable chunks", () => {
  const chunks = chunkChatText("A".repeat(250));
  expect(chunks.length).toBeGreaterThan(1);
  expect(chunks.join("")).toBe("A".repeat(250));
});
