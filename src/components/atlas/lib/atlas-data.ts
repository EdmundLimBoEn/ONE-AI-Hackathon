import type {
  DocMeta,
  GraphData,
  GraphEdge,
  GraphNode,
  TreeNode,
} from "@/lib/types";
import fixtureGraph from "@/fixtures/graph.json";
import fixtureTree from "@/fixtures/tree.json";
import { DEMO_DOCS, type DemoDoc } from "./demo-corpus";

export type DataSource = "live" | "fixture" | "demo";

export interface AtlasDoc {
  meta: DocMeta;
  content: string;
  source: DataSource;
}

export interface AtlasIndex {
  graph: GraphData;
  tree: TreeNode;
  source: DataSource;
  docsById: Map<string, GraphNode>;
  neighbours: Map<string, Set<string>>;
  backlinks: Map<string, Set<string>>;
  tagCounts: Map<string, number>;
}

/** Below this the graph reads as broken rather than sparse, so we seed demo data. */
const MIN_USEFUL_NODES = 20;

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("json")) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asStringArray(value: unknown): string[] {
  return asArray(value).filter((v): v is string => typeof v === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toMeta(raw: unknown): DocMeta | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id : null;
  if (!id) return null;
  const yearValue = raw.year;
  return {
    id,
    title: typeof raw.title === "string" ? raw.title : id,
    citation: typeof raw.citation === "string" ? raw.citation : "",
    court: typeof raw.court === "string" ? raw.court : "SGC",
    year:
      typeof yearValue === "number"
        ? yearValue
        : Number.parseInt(String(yearValue ?? ""), 10) || 0,
    categoryPath: asStringArray(raw.categoryPath),
    tags: asStringArray(raw.tags),
    summary: typeof raw.summary === "string" ? raw.summary : "",
    relatedIds: asStringArray(raw.relatedIds),
    sourceUrl: typeof raw.sourceUrl === "string" ? raw.sourceUrl : undefined,
    kind:
      raw.kind === "judgment" || raw.kind === "statute" || raw.kind === "overview"
        ? raw.kind
        : undefined,
  };
}

function normalizeGraph(raw: unknown): GraphData | null {
  const payload = isRecord(raw) && isRecord(raw.graph) ? raw.graph : raw;
  if (!isRecord(payload)) return null;
  const rawNodes = asArray(payload.nodes);
  if (rawNodes.length === 0) return null;

  const nodes: GraphNode[] = [];
  for (const item of rawNodes) {
    const meta = toMeta(item);
    if (!meta) continue;
    const degree = isRecord(item) && typeof item.degree === "number" ? item.degree : 0;
    nodes.push({ ...meta, degree });
  }
  if (nodes.length === 0) return null;

  const ids = new Set(nodes.map((n) => n.id));
  const rawEdges = asArray(payload.edges ?? payload.links);
  const edges: GraphEdge[] = [];
  for (const item of rawEdges) {
    if (!isRecord(item)) continue;
    const source =
      typeof item.source === "string"
        ? item.source
        : isRecord(item.source) && typeof item.source.id === "string"
          ? item.source.id
          : null;
    const target =
      typeof item.target === "string"
        ? item.target
        : isRecord(item.target) && typeof item.target.id === "string"
          ? item.target.id
          : null;
    if (!source || !target || !ids.has(source) || !ids.has(target)) continue;
    edges.push({
      source,
      target,
      kind:
        item.kind === "wikilink" ||
        item.kind === "shared-tag" ||
        item.kind === "citation" ||
        item.kind === "related"
          ? item.kind
          : "related",
      weight: typeof item.weight === "number" ? item.weight : 1,
    });
  }

  return {
    nodes,
    edges,
    generatedAt:
      typeof payload.generatedAt === "string"
        ? payload.generatedAt
        : new Date().toISOString(),
  };
}

function normalizeTree(raw: unknown): TreeNode | null {
  const payload = isRecord(raw) && isRecord(raw.tree) ? raw.tree : raw;
  if (!isRecord(payload)) return null;
  const walk = (node: unknown): TreeNode | null => {
    if (!isRecord(node)) return null;
    const id = typeof node.id === "string" ? node.id : null;
    const name = typeof node.name === "string" ? node.name : null;
    if (!id || !name) return null;
    const children = asArray(node.children)
      .map(walk)
      .filter((child): child is TreeNode => child !== null);
    return {
      id,
      name,
      type: node.type === "document" ? "document" : "folder",
      path: asStringArray(node.path),
      docId: typeof node.docId === "string" ? node.docId : undefined,
      children: children.length > 0 ? children : undefined,
    };
  };
  const tree = walk(payload);
  if (!tree) return null;
  return countDocuments(tree) > 0 ? tree : null;
}

function countDocuments(node: TreeNode): number {
  if (node.type === "document") return 1;
  return (node.children ?? []).reduce((sum, c) => sum + countDocuments(c), 0);
}

/** Derives related + shared-tag edges so a bare document list still renders a graph. */
export function buildGraph(docs: DocMeta[]): GraphData {
  const ids = new Set(docs.map((d) => d.id));
  const seen = new Set<string>();
  const edges: GraphEdge[] = [];

  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

  for (const doc of docs) {
    for (const related of doc.relatedIds) {
      if (!ids.has(related) || related === doc.id) continue;
      const k = key(doc.id, related);
      if (seen.has(k)) continue;
      seen.add(k);
      edges.push({ source: doc.id, target: related, kind: "related", weight: 2 });
    }
  }

  const byTag = new Map<string, string[]>();
  for (const doc of docs) {
    for (const tag of doc.tags) {
      const bucket = byTag.get(tag) ?? [];
      bucket.push(doc.id);
      byTag.set(tag, bucket);
    }
  }
  const shared = new Map<string, number>();
  for (const bucket of byTag.values()) {
    // Very common tags say little about relatedness and produce a hairball.
    if (bucket.length > 8) continue;
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const k = key(bucket[i], bucket[j]);
        shared.set(k, (shared.get(k) ?? 0) + 1);
      }
    }
  }
  for (const [k, count] of shared) {
    if (count < 2 || seen.has(k)) continue;
    const [source, target] = k.split("|");
    seen.add(k);
    edges.push({ source, target, kind: "shared-tag", weight: count });
  }

  const degrees = new Map<string, number>();
  for (const edge of edges) {
    degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
  }

  return {
    nodes: docs.map((doc) => ({ ...doc, degree: degrees.get(doc.id) ?? 0 })),
    edges,
    generatedAt: new Date().toISOString(),
  };
}

export function buildTree(docs: DocMeta[], rootName = "Singapore Law Atlas"): TreeNode {
  const root: TreeNode = { id: "root", name: rootName, type: "folder", path: [], children: [] };

  for (const doc of docs) {
    const segments = doc.categoryPath.length > 0 ? doc.categoryPath : ["Uncategorised"];
    let cursor = root;
    const path: string[] = [];
    for (const segment of segments) {
      path.push(segment);
      const slug = path.join("/").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      cursor.children ??= [];
      let next = cursor.children.find(
        (child) => child.type === "folder" && child.name === segment,
      );
      if (!next) {
        next = { id: slug, name: segment, type: "folder", path: [...path], children: [] };
        cursor.children.push(next);
      }
      cursor = next;
    }
    cursor.children ??= [];
    cursor.children.push({
      id: doc.id,
      name: doc.title,
      type: "document",
      path: [...path, doc.title],
      docId: doc.id,
    });
  }

  const sort = (node: TreeNode) => {
    node.children?.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    node.children?.forEach(sort);
  };
  sort(root);
  return root;
}

function indexGraph(graph: GraphData, tree: TreeNode, source: DataSource): AtlasIndex {
  const docsById = new Map(graph.nodes.map((node) => [node.id, node]));
  const neighbours = new Map<string, Set<string>>();
  const backlinks = new Map<string, Set<string>>();

  const link = (map: Map<string, Set<string>>, from: string, to: string) => {
    const set = map.get(from) ?? new Set<string>();
    set.add(to);
    map.set(from, set);
  };

  for (const edge of graph.edges) {
    link(neighbours, edge.source, edge.target);
    link(neighbours, edge.target, edge.source);
    if (edge.kind === "wikilink" || edge.kind === "citation" || edge.kind === "related") {
      link(backlinks, edge.target, edge.source);
    }
  }
  for (const node of graph.nodes) {
    for (const related of node.relatedIds) {
      if (docsById.has(related)) link(backlinks, related, node.id);
    }
  }

  const tagCounts = new Map<string, number>();
  for (const node of graph.nodes) {
    for (const tag of node.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }

  return { graph, tree, source, docsById, neighbours, backlinks, tagCounts };
}

const demoGraph = () => buildGraph(DEMO_DOCS);

export async function loadIndex(): Promise<AtlasIndex> {
  const [graphRaw, treeRaw] = await Promise.all([
    fetchJson<unknown>("/api/index/graph"),
    fetchJson<unknown>("/api/index/tree"),
  ]);

  let source: DataSource = "live";
  let graph = normalizeGraph(graphRaw);

  if (!graph) {
    source = "fixture";
    graph = normalizeGraph(fixtureGraph);
  }
  if (!graph || graph.nodes.length < MIN_USEFUL_NODES) {
    const seeded = graph ? mergeDocs(graph.nodes, DEMO_DOCS) : DEMO_DOCS;
    graph = seeded === DEMO_DOCS ? demoGraph() : buildGraph(seeded);
    source = "demo";
  }
  if (graph.edges.length === 0) {
    graph = buildGraph(graph.nodes);
  }

  let tree = source === "live" ? normalizeTree(treeRaw) : null;
  if (!tree && source === "fixture") tree = normalizeTree(fixtureTree);
  if (!tree || countDocuments(tree) < graph.nodes.length) {
    tree = buildTree(graph.nodes);
  }

  return indexGraph(graph, tree, source);
}

function mergeDocs(primary: DocMeta[], extra: DocMeta[]): DocMeta[] {
  const seen = new Set(primary.map((d) => d.id));
  return [...primary, ...extra.filter((d) => !seen.has(d.id))];
}

function extractContent(raw: unknown): string | null {
  if (typeof raw === "string") return raw;
  if (!isRecord(raw)) return null;
  for (const key of ["content", "markdown", "body", "text"]) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  if (isRecord(raw.doc)) return extractContent(raw.doc);
  if (isRecord(raw.data)) return extractContent(raw.data);
  return null;
}

function extractMeta(raw: unknown): DocMeta | null {
  if (!isRecord(raw)) return null;
  if (isRecord(raw.meta)) return toMeta(raw.meta);
  if (isRecord(raw.doc)) return toMeta(raw.doc) ?? extractMeta(raw.doc);
  return toMeta(raw);
}

/**
 * Builds a readable document from metadata alone, so selecting any node in the
 * graph always opens something substantive even before the corpus is indexed.
 */
export function synthesizeContent(meta: DocMeta, index?: AtlasIndex): string {
  const lines: string[] = [];
  if (meta.summary) lines.push(`## In brief\n\n${meta.summary}`);

  const facets = [
    ["Court", meta.court],
    ["Year", meta.year ? String(meta.year) : ""],
    ["Citation", meta.citation],
    ["Category", meta.categoryPath.join(" › ")],
  ].filter(([, value]) => Boolean(value));

  if (facets.length > 0) {
    lines.push(
      `## Record\n\n| Field | Value |\n| --- | --- |\n${facets
        .map(([label, value]) => `| ${label} | ${value} |`)
        .join("\n")}`,
    );
  }

  if (meta.tags.length > 0) {
    lines.push(
      `## Issues raised\n\n${meta.tags.map((tag) => `- ${tag.replace(/-/g, " ")}`).join("\n")}`,
    );
  }

  const related = meta.relatedIds.filter((id) => !index || index.docsById.has(id));
  if (related.length > 0) {
    lines.push(
      `## Authorities in this line\n\n${related
        .map((id) => {
          const title = index?.docsById.get(id)?.title;
          return `- [[${id}${title ? `|${title}` : ""}]]`;
        })
        .join("\n")}`,
    );
  }

  lines.push(
    `> Full text is not in the local index yet. This view is assembled from the atlas metadata${
      meta.sourceUrl ? ` — the authoritative text is available at the source link above.` : "."
    }`,
  );

  return lines.join("\n\n");
}

export async function loadDoc(id: string, index: AtlasIndex): Promise<AtlasDoc> {
  const known = index.docsById.get(id);
  const raw = await fetchJson<unknown>(`/api/doc/${encodeURIComponent(id)}`);
  const content = extractContent(raw);
  const meta = extractMeta(raw) ?? known ?? null;

  if (content && meta) return { meta, content, source: "live" };

  const demo = DEMO_DOCS.find((doc): doc is DemoDoc => doc.id === id);
  const fallbackMeta = meta ?? demo ?? null;
  if (!fallbackMeta) {
    throw new Error(`No document found for "${id}"`);
  }
  if (demo?.content) {
    return { meta: fallbackMeta, content: demo.content, source: "demo" };
  }
  return {
    meta: fallbackMeta,
    content: synthesizeContent(fallbackMeta, index),
    source: index.source === "live" ? "fixture" : index.source,
  };
}

/** Resolves `[[target]]` against ids, then titles, then slugified titles. */
export function resolveWikilink(target: string, index: AtlasIndex): GraphNode | null {
  const raw = target.trim();
  if (!raw) return null;
  if (index.docsById.has(raw)) return index.docsById.get(raw) ?? null;

  const lower = raw.toLowerCase();
  const slug = lower.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  for (const node of index.docsById.values()) {
    if (node.title.toLowerCase() === lower) return node;
    if (node.citation.toLowerCase() === lower) return node;
    if (node.id.replace(/[^a-z0-9]+/g, "-") === slug) return node;
  }
  for (const node of index.docsById.values()) {
    if (node.title.toLowerCase().includes(lower)) return node;
  }
  return null;
}
