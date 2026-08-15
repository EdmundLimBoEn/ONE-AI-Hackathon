import { describe, expect, test } from "bun:test";
import type { SearchResult } from "../../src/lib/types";
import { buildRagMessages, renderCitation } from "../../src/lib/server/prompts";
import {
  buildOpenRouterRequestBody,
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
    expect(messages[0].content).toContain("do not invent authorities");
    expect(messages[1].content).toContain("Document ID: spandeck-v-dsta-2007");
    expect(messages[1].content).toContain("[Spandeck Engineering v DSTA [2007] SGCA 37]");
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
});
