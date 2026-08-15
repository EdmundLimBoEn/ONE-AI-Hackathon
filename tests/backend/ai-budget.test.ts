import { describe, expect, mock, test } from "bun:test";
import type { LawAtlasEnv } from "../../src/lib/cloudflare";
import {
  COMPLETION_UNITS,
  createMemoryBudget,
  depositionWorkUnits,
  MAX_DEPOSITION_ISSUES,
  RETRIEVE_UNITS,
} from "../../src/lib/server/ai-budget";
import { analyzeDeposition } from "../../src/lib/server/deposition";
import { retrieve } from "../../src/lib/server/retrieval";

const TRANSCRIPT =
  "The plaintiff slipped on a wet floor after the occupier failed to inspect the premises and provide any warning. The contractor said training and supervision were never given.";

describe("deployment-wide AI budget", () => {
  test("distinct clients share one budget and cannot exceed it", async () => {
    const budget = createMemoryBudget(3);
    expect(await budget.consume(2)).toBe(true);
    expect(await budget.consume(2)).toBe(false);
    expect(budget.used).toBe(2);
  });

  test("deposition work units cover both completions and each retrieval", () => {
    expect(depositionWorkUnits(5)).toBe(
      COMPLETION_UNITS + MAX_DEPOSITION_ISSUES * RETRIEVE_UNITS + COMPLETION_UNITS,
    );
    expect(depositionWorkUnits(2)).toBe(COMPLETION_UNITS + 2 * RETRIEVE_UNITS + COMPLETION_UNITS);
  });

  test("exhausted budget skips provider APIs and returns local fixtures", async () => {
    const run = mock(async () => {
      throw new Error("Workers AI should not run");
    });
    const query = mock(async () => {
      throw new Error("Vectorize should not run");
    });
    const env = {
      AI: { run },
      LAW_CORPUS: { query },
    } as unknown as LawAtlasEnv;
    const fetchMock = mock(async () => {
      throw new Error("OpenRouter should not be called");
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const budget = createMemoryBudget(0);
      const results = await retrieve(env, "duty of care", 3, budget);
      expect(run).not.toHaveBeenCalled();
      expect(query).not.toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);

      const issues = await analyzeDeposition(
        { env, openRouterKey: "sk-test" },
        TRANSCRIPT,
        { consent: true, budget },
      );
      expect(fetchMock).not.toHaveBeenCalled();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.assessment).toContain("Local preview");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("missing consent never sends the transcript to OpenRouter", async () => {
    const fetchMock = mock(async () => {
      throw new Error("OpenRouter should not be called");
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      const issues = await analyzeDeposition(
        { env: null, openRouterKey: "sk-test" },
        TRANSCRIPT,
        { consent: false, budget: createMemoryBudget(100) },
      );
      expect(fetchMock).not.toHaveBeenCalled();
      expect(issues[0]?.assessment).toContain("Local preview");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("a live deposition consumes work units for completions and retrievals", async () => {
    const run = mock(async () => ({ data: Array.from({ length: 768 }, () => 0.1) }));
    const query = mock(async () => ({ matches: [] }));
    const env = {
      AI: { run },
      LAW_CORPUS: { query },
    } as unknown as LawAtlasEnv;
    const budget = createMemoryBudget(100);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => {
      throw new Error("force local completion fallback after budget charge");
    }) as unknown as typeof fetch;

    try {
      const issues = await analyzeDeposition(
        { env, openRouterKey: "sk-test" },
        TRANSCRIPT,
        { consent: true, budget },
      );
      expect(issues.length).toBeGreaterThan(0);
      expect(budget.used).toBe(
        COMPLETION_UNITS + issues.length * RETRIEVE_UNITS + COMPLETION_UNITS,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
