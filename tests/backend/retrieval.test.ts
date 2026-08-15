import { describe, expect, test } from "bun:test";
import {
  embeddingFromOutput,
  VECTOR_DIMENSIONS,
} from "../../src/lib/server/retrieval";

describe("embedding response validation", () => {
  test("extracts both Workers AI embedding response shapes", () => {
    expect(embeddingFromOutput({ data: [[0.1, 0.2]] })).toEqual([0.1, 0.2]);
    expect(embeddingFromOutput({ data: [0.1, 0.2] })).toEqual([0.1, 0.2]);
  });

  test("rejects missing and non-finite vectors", () => {
    expect(embeddingFromOutput({})).toBeNull();
    expect(embeddingFromOutput({ data: [[0.1, Number.NaN]] })).toBeNull();
  });

  test("keeps the index dimension contract explicit", () => {
    expect(VECTOR_DIMENSIONS).toBe(768);
  });
});
