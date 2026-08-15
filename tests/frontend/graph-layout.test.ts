import { describe, expect, test } from "bun:test";
import type { GraphData, GraphNode } from "../../src/lib/types";
import {
  buildLayeredGraph,
  MAX_DOCUMENT_CONNECTIONS,
} from "../../src/components/atlas/lib/graph-layout";
import { buildTree } from "../../src/components/atlas/lib/atlas-data";

function node(id: string, categoryPath: string[]): GraphNode {
  return {
    id,
    title: id,
    citation: `[2026] SGHC ${id.length}`,
    court: "SGHC",
    year: 2026,
    categoryPath,
    tags: ["shared"],
    summary: `${id} summary`,
    relatedIds: [],
    kind: "judgment",
    degree: 0,
  };
}

describe("layered atlas graph", () => {
  const nodes = [
    node("contract-a", ["Commercial Law", "Contract"]),
    node("contract-b", ["Commercial Law", "Contract"]),
    node("negligence-a", ["Civil Liability", "Negligence"]),
    node("negligence-b", ["Civil Liability", "Negligence"]),
  ];
  const graph: GraphData = {
    nodes,
    generatedAt: new Date(0).toISOString(),
    edges: nodes.flatMap((left, leftIndex) =>
      nodes.slice(leftIndex + 1).map((right) => ({
        source: left.id,
        target: right.id,
        kind: "related" as const,
        weight: 2,
      })),
    ),
  };

  test("builds domain, topic, subtopic and document layers", () => {
    const layout = buildLayeredGraph(graph);
    expect(layout.nodes.some((item) => item.id === "root:singapore-law")).toBe(true);
    expect(layout.nodes.some((item) => item.id === "domain:civil-law")).toBe(true);
    expect(layout.nodes.some((item) => item.id === "topic:commercial-law")).toBe(true);
    expect(layout.nodes.some((item) => item.id === "subtopic:commercial-law:contract")).toBe(true);
    expect(layout.nodes.filter((item) => item.role === "document")).toHaveLength(nodes.length);
  });

  test("caps each document at three total connections", () => {
    const layout = buildLayeredGraph(graph);
    const degrees = new Map<string, number>();
    for (const link of layout.links) {
      const source = typeof link.source === "string" ? link.source : link.source.id;
      const target = typeof link.target === "string" ? link.target : link.target.id;
      degrees.set(source, (degrees.get(source) ?? 0) + 1);
      degrees.set(target, (degrees.get(target) ?? 0) + 1);
    }
    for (const document of nodes) {
      expect(degrees.get(document.id)).toBeLessThanOrEqual(MAX_DOCUMENT_CONNECTIONS);
    }
  });

  test("prefixes the folder tree with a legal domain", () => {
    const tree = buildTree(nodes);
    expect(tree.children?.map((child) => child.name)).toContain("Civil law");
    expect(tree.children?.[0]?.children?.some((child) => child.name === "Commercial Law")).toBe(true);
  });
});
