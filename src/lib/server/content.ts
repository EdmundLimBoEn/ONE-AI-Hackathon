import graphFixture from "@/fixtures/graph.json";
import treeFixture from "@/fixtures/tree.json";
import {
  buildDocumentMarkdown,
  ensureCompleteSummary,
  finalizeDocumentMarkdown,
} from "@/lib/document-brief";
import { DEMO_DOCS } from "@/components/atlas/lib/demo-corpus";
import type { GraphData, TreeNode } from "@/lib/types";
import type { LawAtlasEnv } from "@/lib/cloudflare";
import { withTimeout } from "./errors";

const graph = graphFixture as unknown as GraphData;
const tree = treeFixture as unknown as TreeNode;
const demoById = new Map(DEMO_DOCS.map((doc) => [doc.id, doc]));

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
  const demo = demoById.get(id);
  if (demo?.content) {
    const meta = { ...demo, summary: ensureCompleteSummary(demo) };
    return finalizeDocumentMarkdown(demo.content, meta);
  }

  const node = graph.nodes.find((candidate) => candidate.id === id) ?? demo;
  if (!node) return null;
  const meta = { ...node, summary: ensureCompleteSummary(node) };
  const relatedTitles = new Map(
    meta.relatedIds
      .map((relatedId) => {
        const related =
          graph.nodes.find((candidate) => candidate.id === relatedId) ??
          demoById.get(relatedId);
        return related ? ([relatedId, related.title] as const) : null;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null),
  );
  return buildDocumentMarkdown(meta, {
    relatedIds: meta.relatedIds,
    relatedTitles,
    body: demo && "content" in demo ? demo.content : undefined,
  });
}

export async function getDocument(env: LawAtlasEnv | null, id: string): Promise<string | null> {
  if (env?.LAW_VAULT) {
    for (const key of [`docs/${id}.md`, `vault/${id}.md`, `documents/${id}.md`, `${id}.md`]) {
      const object = await withTimeout(env.LAW_VAULT.get(key), 8_000, "Document store");
      if (object) {
        const text = await object.text();
        const node = graph.nodes.find((candidate) => candidate.id === id);
        if (!node) return text;
        return finalizeDocumentMarkdown(text, {
          ...node,
          summary: ensureCompleteSummary(node),
        });
      }
    }
  }
  return fixtureMarkdown(id);
}
