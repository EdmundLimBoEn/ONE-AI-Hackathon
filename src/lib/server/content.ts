import graphFixture from "@/fixtures/graph.json";
import treeFixture from "@/fixtures/tree.json";
import type { GraphData, TreeNode } from "@/lib/types";
import type { LawAtlasEnv } from "@/lib/cloudflare";
import { withTimeout } from "./errors";

const graph = graphFixture as unknown as GraphData;
const tree = treeFixture as unknown as TreeNode;

export type IndexKind = "graph" | "tree";

export async function getIndex(env: LawAtlasEnv | null, kind: IndexKind): Promise<unknown> {
  if (env?.LAW_VAULT) {
    for (const key of [`indexes/${kind}.json`, `${kind}.json`]) {
      const object = await withTimeout(env.LAW_VAULT.get(key), 8_000, "Document store");
      if (object) return object.json();
    }
  }
  return kind === "graph" ? graph : tree;
}

function fixtureMarkdown(id: string): string | null {
  const node = graph.nodes.find((candidate) => candidate.id === id);
  if (!node) return null;
  const related = node.relatedIds.length
    ? node.relatedIds.map((relatedId) => `- [[${relatedId}]]`).join("\n")
    : "- No related precedents in the local fixture.";
  return `---
id: ${node.id}
title: ${JSON.stringify(node.title)}
citation: ${JSON.stringify(node.citation)}
court: ${node.court}
year: ${node.year}
categoryPath: ${JSON.stringify(node.categoryPath)}
tags: ${JSON.stringify(node.tags)}
---

# ${node.title}

${node.citation}

## Summary

${node.summary}

## Related precedents

${related}
`;
}

export async function getDocument(env: LawAtlasEnv | null, id: string): Promise<string | null> {
  if (env?.LAW_VAULT) {
    for (const key of [`docs/${id}.md`, `vault/${id}.md`, `documents/${id}.md`, `${id}.md`]) {
      const object = await withTimeout(env.LAW_VAULT.get(key), 8_000, "Document store");
      if (object) return object.text();
    }
  }
  return fixtureMarkdown(id);
}
