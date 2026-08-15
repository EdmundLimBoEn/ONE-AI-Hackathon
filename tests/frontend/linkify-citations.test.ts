import { describe, expect, test } from "bun:test";
import type { GraphNode } from "../../src/lib/types";
import type { AtlasIndex } from "../../src/components/atlas/lib/atlas-data";
import {
  extractCitedDocIds,
  linkifyAtlasCitations,
} from "../../src/components/atlas/lib/linkify-citations";

function node(partial: Partial<GraphNode> & Pick<GraphNode, "id" | "title" | "citation">): GraphNode {
  return {
    court: "SGCA",
    year: 2007,
    categoryPath: ["Civil Liability"],
    tags: [],
    summary: "summary",
    relatedIds: [],
    kind: "judgment",
    degree: 1,
    ...partial,
  };
}

function indexOf(nodes: GraphNode[]): AtlasIndex {
  const docsById = new Map(nodes.map((item) => [item.id, item]));
  return {
    graph: { nodes, edges: [], generatedAt: new Date(0).toISOString() },
    tree: { id: "root", name: "root", type: "folder", path: [] },
    source: "demo",
    docsById,
    neighbours: new Map(),
    backlinks: new Map(),
    tagCounts: new Map(),
  };
}

const spandeck = node({
  id: "spandeck-v-dsta-2007",
  title: "Spandeck Engineering (S) Pte Ltd v Defence Science & Technology Agency",
  citation: "[2007] SGCA 37",
});

const penal = node({
  id: "penal-code-1871",
  title: "Penal Code 1871",
  citation: "2020 Rev Ed",
  court: "Parliament",
  year: 1871,
  kind: "statute",
  categoryPath: ["Statutes", "Criminal Codes"],
});

describe("linkifyAtlasCitations", () => {
  const index = indexOf([spandeck, penal]);

  test("leaves existing wikilinks intact", () => {
    const input = "See [[spandeck-v-dsta-2007|Spandeck]] on duty.";
    expect(linkifyAtlasCitations(input, index)).toBe(input);
  });

  test("turns bare neutral citations into openable wikilinks", () => {
    const out = linkifyAtlasCitations("The duty test is in [2007] SGCA 37.", index);
    expect(out).toContain("[[spandeck-v-dsta-2007|[2007] SGCA 37]]");
  });

  test("turns [Title citation] model labels into wikilinks", () => {
    const out = linkifyAtlasCitations(
      "Apply [Spandeck Engineering (S) Pte Ltd v Defence Science & Technology Agency [2007] SGCA 37] here.",
      index,
    );
    expect(out).toContain("[[spandeck-v-dsta-2007|");
    expect(out).toContain("[2007] SGCA 37]]");
  });

  test("turns full unique titles into wikilinks", () => {
    const out = linkifyAtlasCitations(
      `Read ${spandeck.title} for the framework.`,
      index,
    );
    expect(out).toContain(`[[spandeck-v-dsta-2007|${spandeck.title}]]`);
  });

  test("extractCitedDocIds finds wikilink targets", () => {
    const ids = extractCitedDocIds(
      "See [[spandeck-v-dsta-2007|Spandeck]] and [2007] SGCA 37 again.",
      index,
    );
    expect(ids).toContain("spandeck-v-dsta-2007");
  });
});
