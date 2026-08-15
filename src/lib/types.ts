export type Court = "SGCA" | "SGHC" | "SGDC" | "SGMC" | "SGC" | string;

export interface DocMeta {
  id: string;
  title: string;
  citation: string;
  court: Court;
  year: number;
  categoryPath: string[];
  tags: string[];
  summary: string;
  relatedIds: string[];
  sourceUrl?: string;
  kind?: "judgment" | "statute" | "overview";
}

export type GraphEdgeKind = "wikilink" | "shared-tag" | "citation" | "related";

export interface GraphNode extends DocMeta { degree: number }

export interface GraphEdge {
  source: string;
  target: string;
  kind: GraphEdgeKind;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  generatedAt: string;
}

export interface TreeNode {
  id: string;
  name: string;
  type: "folder" | "document";
  path: string[];
  docId?: string;
  children?: TreeNode[];
}

export interface SearchResult {
  docId: string;
  title: string;
  citation: string;
  excerpt: string;
  score: number;
}

export interface LiabilityIssue {
  issue: string;
  assessment: string;
  severity: "low" | "medium" | "high";
  precedents: Pick<SearchResult, "docId" | "title" | "citation" | "excerpt">[];
}
