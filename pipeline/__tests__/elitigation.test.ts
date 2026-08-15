import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseJudgmentHtml, parseListingHtml } from "../lib/elitigation";

const fixture = (name: string) => readFile(join(import.meta.dir, "..", "fixtures", "html", name), "utf8");

describe("eLitigation parsing", () => {
  test("extracts and resolves listing links", async () => {
    const results = parseListingHtml(await fixture("listing.html"));
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      url: "https://www.elitigation.sg/gd/s/2007_SGCA_37",
      citation: "[2007] SGCA 37",
      title: "Spandeck Engineering (S) Pte Ltd v Defence Science & Technology Agency",
    });
  });

  test("extracts judgment metadata and readable paragraphs", async () => {
    const result = parseJudgmentHtml(await fixture("judgment.html"), "https://www.elitigation.sg/gd/s/2007_SGCA_37");
    expect(result.id).toBe("2007_SGCA_37");
    expect(result.citation).toBe("[2007] SGCA 37");
    expect(result.court).toBe("SGCA");
    expect(result.year).toBe(2007);
    expect(result.catchwords).toEqual(["Tort — Negligence — Duty of care"]);
    expect(result.body).toContain("factual foreseeability");
  });
});
