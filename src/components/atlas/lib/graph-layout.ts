import type { GraphData, GraphNode } from "@/lib/types";
import { categoryOf, legalDomainOf } from "./categories";
import { SINGAPORE_LAW_OVERVIEW_ID } from "./guide-docs";

export const MAX_DOCUMENT_CONNECTIONS = 3;

export interface LayeredNode {
  id: string;
  node: GraphNode;
  role: "document" | "root" | "domain" | "topic" | "subtopic";
  domain: string;
  category: string;
  memberCategories: string[];
  subtopic?: string;
  radius: number;
  clusterX: number;
  clusterY: number;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  vx?: number;
  vy?: number;
}

export interface LayeredLink {
  source: string | LayeredNode;
  target: string | LayeredNode;
  kind: string;
  weight: number;
}

const DOMAIN_ORDER = ["Civil law", "Criminal justice", "Public law", "Legislation", "Other law"];
const DOMAIN_ANCHORS: Record<string, { x: number; y: number }> = {
  "Civil law": { x: -235, y: 35 },
  "Criminal justice": { x: 265, y: 155 },
  "Public law": { x: 230, y: -225 },
  Legislation: { x: -135, y: -285 },
  "Other law": { x: 0, y: 300 },
};

export function buildLayeredGraph(graph: GraphData): { nodes: LayeredNode[]; links: LayeredLink[] } {
  const categoryBuckets = new Map<string, GraphNode[]>();
  for (const node of graph.nodes) {
    const category = categoryOf(node.categoryPath);
    const bucket = categoryBuckets.get(category) ?? [];
    bucket.push(node);
    categoryBuckets.set(category, bucket);
  }

  const domainCategories = new Map<string, string[]>();
  for (const category of categoryBuckets.keys()) {
    const domain = legalDomainOf(category);
    const categories = domainCategories.get(domain) ?? [];
    categories.push(category);
    domainCategories.set(domain, categories);
  }

  const domainNames = [...domainCategories.keys()].sort(
    (left, right) => domainRank(left) - domainRank(right) || left.localeCompare(right),
  );
  const nodes: LayeredNode[] = [];
  const links: LayeredLink[] = [];
  const allCategories = [...categoryBuckets.keys()];
  const rootId = "root:singapore-law";
  nodes.push({
    id: rootId,
    node: makeGuideNode(rootId, "Singapore law", allCategories[0] ?? "Uncategorised", graph.nodes.length, "root"),
    role: "root",
    domain: "Singapore law",
    category: allCategories[0] ?? "Uncategorised",
    memberCategories: allCategories,
    radius: Math.min(50, 31 + Math.sqrt(graph.nodes.length) * 1.25),
    clusterX: 0,
    clusterY: 0,
    x: 0,
    y: 0,
  });

  domainNames.forEach((domain, domainIndex) => {
    const categories = (domainCategories.get(domain) ?? []).sort((left, right) => {
      const countDelta = (categoryBuckets.get(right)?.length ?? 0) - (categoryBuckets.get(left)?.length ?? 0);
      return countDelta || left.localeCompare(right);
    });
    const documents = categories.flatMap((category) => categoryBuckets.get(category) ?? []);
    const anchor = DOMAIN_ANCHORS[domain] ?? radialAnchor(domainIndex, domainNames.length);
    const domainId = `domain:${slugId(domain)}`;
    const guideCategory = categories[0] ?? "Uncategorised";
    nodes.push({
      id: domainId,
      node: makeGuideNode(domainId, domain, guideCategory, documents.length, "domain"),
      role: "domain",
      domain,
      category: guideCategory,
      memberCategories: categories,
      radius: Math.min(42, 25 + Math.sqrt(documents.length) * 1.35),
      clusterX: anchor.x,
      clusterY: anchor.y,
      x: anchor.x,
      y: anchor.y,
    });
    links.push({ source: rootId, target: domainId, kind: "root-branch", weight: 5 });

    const outwardAngle = Math.atan2(anchor.y, anchor.x || 0.01);
    const topicSpread = Math.min(Math.PI * 1.18, 0.42 + categories.length * 0.3);
    categories.forEach((category, categoryIndex) => {
      const categoryDocuments = categoryBuckets.get(category) ?? [];
      const position = categories.length === 1 ? 0 : categoryIndex / (categories.length - 1) - 0.5;
      const topicAngle = outwardAngle + position * topicSpread;
      const topicDistance = 128 + Math.sqrt(categoryDocuments.length) * 4;
      const topicX = anchor.x + Math.cos(topicAngle) * topicDistance;
      const topicY = anchor.y + Math.sin(topicAngle) * topicDistance;
      const topicId = `topic:${slugId(category)}`;
      nodes.push({
        id: topicId,
        node: makeGuideNode(topicId, category, category, categoryDocuments.length, "topic"),
        role: "topic",
        domain,
        category,
        memberCategories: [category],
        radius: Math.min(28, 14 + Math.sqrt(categoryDocuments.length) * 1.65),
        clusterX: topicX,
        clusterY: topicY,
        x: topicX,
        y: topicY,
      });
      links.push({ source: domainId, target: topicId, kind: "domain-branch", weight: 4 });

      const subtopics = new Map<string, GraphNode[]>();
      for (const document of categoryDocuments) {
        const subtopic = subtopicOf(document);
        const bucket = subtopics.get(subtopic) ?? [];
        bucket.push(document);
        subtopics.set(subtopic, bucket);
      }
      const branches = [...subtopics.entries()].sort(
        (left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0]),
      );

      branches.forEach(([subtopic, branchDocuments], branchIndex) => {
        const branchPosition = branches.length === 1 ? 0 : branchIndex / (branches.length - 1) - 0.5;
        const branchAngle = topicAngle + branchPosition * Math.min(1.05, 0.2 + branches.length * 0.12);
        const branchDistance = 82 + Math.sqrt(branchDocuments.length) * 4;
        const branchX = topicX + Math.cos(branchAngle) * branchDistance;
        const branchY = topicY + Math.sin(branchAngle) * branchDistance;
        const subtopicId = `subtopic:${slugId(category)}:${slugId(subtopic)}`;
        nodes.push({
          id: subtopicId,
          node: makeGuideNode(subtopicId, subtopic, category, branchDocuments.length, "subtopic"),
          role: "subtopic",
          domain,
          category,
          memberCategories: [category],
          subtopic,
          radius: Math.min(16, 7 + Math.sqrt(branchDocuments.length) * 1.5),
          clusterX: branchX,
          clusterY: branchY,
          x: branchX,
          y: branchY,
        });
        links.push({ source: topicId, target: subtopicId, kind: "branch", weight: 3 });

        branchDocuments.forEach((document, ordinal) => {
          const localAngle = ordinal * 2.399963229728653 + hashUnit(document.id) * 0.7;
          const localRadius = 28 + Math.sqrt(ordinal) * 13;
          nodes.push({
            id: document.id,
            node: { ...document, degree: 1 },
            role: "document",
            domain,
            category,
            memberCategories: [category],
            subtopic,
            radius: 4.5,
            clusterX: branchX,
            clusterY: branchY,
            x: branchX + Math.cos(localAngle) * localRadius,
            y: branchY + Math.sin(localAngle) * localRadius,
          });
          links.push({ source: subtopicId, target: document.id, kind: "branch", weight: 2 });
        });
      });
    });
  });

  const documentDegrees = new Map(graph.nodes.map((node) => [node.id, 1]));
  const rankedEdges = [...graph.edges].sort(
    (left, right) => edgeRank(right.kind) - edgeRank(left.kind) || right.weight - left.weight,
  );
  const seen = new Set<string>();
  for (const edge of rankedEdges) {
    if (!documentDegrees.has(edge.source) || !documentDegrees.has(edge.target)) continue;
    const key = pairKey(edge.source, edge.target);
    if (seen.has(key)) continue;
    if (
      (documentDegrees.get(edge.source) ?? 0) >= MAX_DOCUMENT_CONNECTIONS ||
      (documentDegrees.get(edge.target) ?? 0) >= MAX_DOCUMENT_CONNECTIONS
    ) {
      continue;
    }
    seen.add(key);
    documentDegrees.set(edge.source, (documentDegrees.get(edge.source) ?? 0) + 1);
    documentDegrees.set(edge.target, (documentDegrees.get(edge.target) ?? 0) + 1);
    links.push({ ...edge });
  }

  for (const node of nodes) {
    if (node.role !== "document") continue;
    const degree = documentDegrees.get(node.id) ?? 1;
    node.node = { ...node.node, degree };
    node.radius = 4.2 + (degree - 1) * 1.35;
  }

  return { nodes, links };
}

function domainRank(domain: string): number {
  const rank = DOMAIN_ORDER.indexOf(domain);
  return rank < 0 ? DOMAIN_ORDER.length : rank;
}

function radialAnchor(index: number, count: number): { x: number; y: number } {
  const angle = (index / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2;
  return { x: Math.cos(angle) * 280, y: Math.sin(angle) * 280 };
}

function edgeRank(kind: string): number {
  if (kind === "citation" || kind === "wikilink") return 4;
  if (kind === "related") return 3;
  return 1;
}

function subtopicOf(node: GraphNode): string {
  const category = categoryOf(node.categoryPath);
  const raw = node.categoryPath[1]?.trim();
  if (!raw || raw.toLowerCase() === category.toLowerCase()) return "General";
  const concise = raw.split(/\s+[—–]\s+|\s*\|\s*/)[0].replace(/\]—\[/g, " — ").trim();
  return concise.length > 34 ? `${concise.slice(0, 33)}…` : concise;
}

function makeGuideNode(
  id: string,
  title: string,
  category: string,
  count: number,
  role: "root" | "domain" | "topic" | "subtopic",
): GraphNode {
  const summary =
    role === "root"
      ? `Singapore Law Atlas hub — ${count} authorities spanning written law (Constitution, Penal Code, CPC, Civil Law Act, and other codes) and case law. Click to open the written-law overview of Singapore’s legal system.`
      : role === "domain" && title === "Legislation"
        ? `${count} written-law files: Constitution, Penal Code, CPC, MDA, Evidence Act, Civil Law Act, Companies Act, Women’s Charter, WSHA, and more. Click to open the codes overview.`
        : role === "domain" && title === "Criminal justice"
          ? `${count} criminal authorities. Click to open the Penal Code 1871 — Singapore’s principal criminal code — then follow related procedure and drugs statutes.`
          : role === "domain" && title === "Civil law"
            ? `${count} civil authorities. Click to open the Civil Law Act 1909 (contributory negligence, dependency claims), then negligence and commercial case law.`
            : role === "domain" && title === "Public law"
              ? `${count} public-law authorities. Click to open the Constitution of the Republic of Singapore.`
              : role === "domain"
                ? `${count} files in ${title}. Click a document, or open the Singapore written-law overview from Legislation.`
                : role === "topic" && category === "Statutes"
                  ? `${count} written laws under ${title} — primary legislation with section maps and Singapore Statutes Online links.`
                  : role === "topic"
                    ? `${count} files in ${category}. Click a judgment or statute node to open it.`
                    : `${count} files grouped under ${title}.`;

  return {
    id,
    title,
    citation: `${count} file${count === 1 ? "" : "s"}`,
    court: "Atlas",
    year: 0,
    categoryPath: role === "root" || role === "domain" ? [title] : role === "topic" ? [category] : [category, title],
    tags: [slugId(category), slugId(title), role === "root" ? "singapore-law" : slugId(role)],
    summary,
    relatedIds: role === "root" || title === "Legislation" ? [SINGAPORE_LAW_OVERVIEW_ID] : [],
    kind: "overview",
    degree: count,
  };
}

function hashUnit(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function slugId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function pairKey(left: string, right: string): string {
  return left < right ? `${left}\u0000${right}` : `${right}\u0000${left}`;
}
