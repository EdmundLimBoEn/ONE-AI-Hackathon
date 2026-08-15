import { describe, expect, mock, test } from "bun:test";
import { analyseDeposition } from "../../src/components/deposition/lib/analyse";
import {
  canStartLiveAnalysis,
  consentPayload,
  liveAnalysisDisclosure,
} from "../../src/components/deposition/lib/consent";
import type { ParsedDocument } from "../../src/components/deposition/lib/parse-file";

const parsed: ParsedDocument = {
  filename: "witness-transcript.txt",
  pages: [
    "The occupier left a wet floor unmarked and the plaintiff slipped after no warning was given.",
  ],
  text: "The occupier left a wet floor unmarked and the plaintiff slipped after no warning was given.",
  pageCount: 1,
  words: 16,
  kind: "text",
};

describe("deposition disclosure and consent", () => {
  test("live analysis stays blocked until the disclosure is accepted", () => {
    expect(canStartLiveAnalysis(false)).toBe(false);
    expect(canStartLiveAnalysis(true)).toBe(true);
    expect(liveAnalysisDisclosure()).toContain("OpenRouter");
    expect(liveAnalysisDisclosure()).toContain("no-storage");
    expect(liveAnalysisDisclosure()).toContain("zero-data-retention");
  });

  test("consent state stores only the boolean, never transcript contents or filenames", () => {
    const record = consentPayload(true);
    expect(record).toEqual({ externalProcessingConsent: true });
    expect(JSON.stringify(record)).not.toContain(parsed.filename);
    expect(JSON.stringify(record)).not.toContain(parsed.text);
  });

  test("local-only mode never calls the deposition API or OpenRouter", async () => {
    const fetchMock = mock(async () => {
      throw new Error("fetch should not run in local mode");
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      const result = await analyseDeposition(parsed, null, { mode: "local", consent: true });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.source).toBe("local");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("live mode without consent never calls the deposition API", async () => {
    const fetchMock = mock(async () => {
      throw new Error("fetch should not run without consent");
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      const result = await analyseDeposition(parsed, null, { mode: "live", consent: false });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.source).toBe("local");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
