import { describe, expect, test } from "bun:test";
import { ApiError } from "../../src/lib/server/errors";
import {
  isValidDocId,
  validateChatInput,
  validateDepositionInput,
  validateSearchInput,
} from "../../src/lib/server/validation";

describe("document ID validation", () => {
  test("accepts canonical slugs and rejects traversal", () => {
    expect(isValidDocId("spandeck-v-dsta-2007")).toBe(true);
    expect(isValidDocId("2007_SGCA_37")).toBe(true);
    expect(isValidDocId("../secret")).toBe(false);
    expect(isValidDocId("folder/case")).toBe(false);
    expect(isValidDocId("UPPERCASE")).toBe(true);
  });
});

describe("API input validation", () => {
  test("normalizes search input", () => {
    expect(validateSearchInput({ query: "  duty of care ", topK: 4 })).toEqual({
      query: "duty of care",
      topK: 4,
    });
  });

  test("accepts the latest user chat message", () => {
    expect(
      validateChatInput({
        messages: [
          { role: "user", content: "first" },
          { role: "assistant", content: "reply" },
          { role: "user", content: "latest question" },
        ],
      }).query,
    ).toBe("latest question");
  });

  test("rejects invalid topK and short deposition text", () => {
    expect(() => validateSearchInput({ query: "test", topK: 21 })).toThrow(ApiError);
    expect(() => validateDepositionInput({ text: "too short" })).toThrow(ApiError);
  });
});
