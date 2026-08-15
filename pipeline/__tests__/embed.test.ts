import { expect, test } from "bun:test";
import { chunkText } from "../embed";

test("chunkText keeps overlap and does not drop content", () => {
  const paragraphs = ["A".repeat(70), "B".repeat(70), "C".repeat(70)].join("\n\n");
  const chunks = chunkText(paragraphs, 100, 20);
  expect(chunks.length).toBeGreaterThan(1);
  expect(chunks.join(" ")).toContain("A".repeat(20));
  expect(chunks.at(-1)).toContain("C".repeat(70));
});
