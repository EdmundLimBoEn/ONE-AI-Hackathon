import { describe, expect, test } from "bun:test";
import { buildGraph, buildTree, wikilinks } from "../index";
import type { VaultMeta } from "../lib/types";

const meta = (id: string, title: string, tags: string[], relatedIds: string[] = []): VaultMeta => ({
  id, title, citation: `[2020] SGCA ${id === "a" ? 1 : 2}`, court: "SGCA", year: 2020,
  categoryPath: ["Civil Liability", "Negligence"], tags, summary: `${title} summary`, relatedIds, kind: "judgment",
});

describe("vault indexes", () => {
  test("parses aliased and heading wikilinks", () => {
    expect(wikilinks("[[a|Case A]] and [[b#Holding]]")).toEqual(["a", "b"]);
  });

  test("builds schema-compatible graph and de-duplicates edges", () => {
    const graph = buildGraph([
      { meta: meta("a", "Case A", ["negligence"], ["b"]), content: "See [[b|Case B]]." },
      { meta: meta("b", "Case B", ["negligence"]), content: "" },
    ]);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges.some((edge) => edge.kind === "wikilink" && edge.source === "a" && edge.target === "b")).toBeTrue();
    expect(graph.edges.some((edge) => edge.kind === "related")).toBeTrue();
    expect(graph.edges.some((edge) => edge.kind === "shared-tag")).toBeTrue();
    expect(graph.nodes.every((node) => node.degree === 3)).toBeTrue();
  });

  test("builds a nested folder tree", () => {
    const tree = buildTree([{ meta: meta("a", "Case A", ["negligence"]) }, { meta: meta("b", "Case B", ["negligence"]) }]);
    expect(tree.id).toBe("root");
    expect(tree.children?.[0].name).toBe("Civil Liability");
    expect(tree.children?.[0].children?.[0].name).toBe("Negligence");
    expect(tree.children?.[0].children?.[0].children?.map((node) => node.docId)).toEqual(["a", "b"]);
  });
});
