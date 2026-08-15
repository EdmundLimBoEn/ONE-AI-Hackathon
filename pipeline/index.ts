#!/usr/bin/env bun
import { join, resolve } from "node:path";
import { hasFlag, log, option, safeSlug } from "./lib/cli";
import { loadVault, PIPELINE_ROOT, writeJson } from "./lib/files";
import type { VaultMeta } from "./lib/types";

export interface GraphEdge { source: string; target: string; kind: "wikilink" | "shared-tag" | "citation" | "related"; weight: number }
export interface GraphNode extends VaultMeta { degree: number }
export interface TreeNode { id: string; name: string; type: "folder" | "document"; path: string[]; docId?: string; children?: TreeNode[] }

function wikilinks(markdown: string): string[] {
  return [...markdown.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)].map((match) => match[1].trim());
}

function edgeKey(edge: GraphEdge): string {
  const directed = edge.kind === "wikilink" || edge.kind === "citation" || edge.kind === "related";
  const pair = directed || edge.source < edge.target ? `${edge.source}>${edge.target}` : `${edge.target}>${edge.source}`;
  return `${edge.kind}:${pair}`;
}

export function buildGraph(entries: Array<{ meta: VaultMeta; content: string }>): { nodes: GraphNode[]; edges: GraphEdge[]; generatedAt: string } {
  const ids = new Set(entries.map(({ meta }) => meta.id));
  const edges = new Map<string, GraphEdge>();
  const add = (edge: GraphEdge) => {
    if (edge.source === edge.target || !ids.has(edge.source) || !ids.has(edge.target)) return;
    const key = edgeKey(edge);
    const previous = edges.get(key);
    if (!previous || previous.weight < edge.weight) edges.set(key, edge);
  };
  for (const { meta, content } of entries) {
    for (const target of wikilinks(content)) add({ source: meta.id, target, kind: "wikilink", weight: 1 });
    for (const target of meta.relatedIds ?? []) add({ source: meta.id, target, kind: "related", weight: 1.2 });
  }
  const tagOwners = new Map<string, string[]>();
  for (const { meta } of entries) for (const tag of meta.tags ?? []) {
    const owners = tagOwners.get(tag) ?? [];
    if (owners.length < 30) owners.push(meta.id);
    tagOwners.set(tag, owners);
  }
  for (const owners of tagOwners.values()) for (let left = 0; left < owners.length; left++) {
    for (let right = left + 1; right < owners.length; right++) add({ source: owners[left], target: owners[right], kind: "shared-tag", weight: 0.35 });
  }
  const edgeList = [...edges.values()];
  const degrees = new Map<string, number>();
  for (const edge of edgeList) {
    degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
  }
  return {
    nodes: entries.map(({ meta }) => ({ ...meta, relatedIds: meta.relatedIds ?? [], degree: degrees.get(meta.id) ?? 0 })).sort((a, b) => a.title.localeCompare(b.title)),
    edges: edgeList.sort((a, b) => edgeKey(a).localeCompare(edgeKey(b))),
    generatedAt: new Date().toISOString(),
  };
}

export function buildTree(entries: Array<{ meta: VaultMeta }>): TreeNode {
  const roots: TreeNode[] = [];
  for (const { meta } of [...entries].sort((a, b) => a.meta.title.localeCompare(b.meta.title))) {
    let level = roots;
    const path: string[] = [];
    for (const segment of meta.categoryPath) {
      path.push(segment);
      let folder = level.find((node) => node.type === "folder" && node.name === segment);
      if (!folder) {
        folder = { id: `folder-${path.map(safeSlug).join("-")}`, name: segment, type: "folder", path: [...path], children: [] };
        level.push(folder);
      }
      level = folder.children!;
    }
    level.push({ id: `document-${meta.id}`, name: meta.title, type: "document", path: [...path, meta.title], docId: meta.id });
  }
  const sort = (nodes: TreeNode[]): TreeNode[] => nodes.sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1).map((node) => ({ ...node, children: node.children ? sort(node.children) : undefined }));
  return { id: "root", name: "Singapore Law Atlas", type: "folder", path: [], children: sort(roots) };
}

async function main(): Promise<void> {
  if (hasFlag("help")) {
    log("Usage: bun pipeline/index.ts [--vault DIR] [--out DIR]");
    return;
  }
  const vaultDir = resolve(option("vault", join(PIPELINE_ROOT, "vault"))!);
  const outDir = resolve(option("out", join(PIPELINE_ROOT, "generated"))!);
  const entries = await loadVault(vaultDir);
  const graph = buildGraph(entries);
  const tree = buildTree(entries);
  await Promise.all([writeJson(join(outDir, "graph.json"), graph), writeJson(join(outDir, "tree.json"), tree)]);
  log(`Indexed ${graph.nodes.length} nodes and ${graph.edges.length} edges.`);
}

if (import.meta.main) await main();

export { wikilinks };
