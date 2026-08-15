import type { GraphNode, SearchResult } from "@/lib/types";

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}

function excerptFor(node: GraphNode, tokens: string[]): string {
  const haystack = node.summary || node.categoryPath.join(" › ");
  const lower = haystack.toLowerCase();
  const hit = tokens.map((t) => lower.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (hit === undefined) return haystack.slice(0, 140);
  const start = Math.max(0, hit - 48);
  const slice = haystack.slice(start, start + 150).trim();
  return `${start > 0 ? "…" : ""}${slice}${start + 150 < haystack.length ? "…" : ""}`;
}

/**
 * Field-weighted substring search. The corpus is small enough that a linear
 * scan beats shipping an index, and it keeps results stable as the user types.
 */
export function searchNodes(
  nodes: Iterable<GraphNode>,
  query: string,
  limit = 40,
): SearchResult[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const results: SearchResult[] = [];
  for (const node of nodes) {
    const title = node.title.toLowerCase();
    const citation = node.citation.toLowerCase();
    const category = node.categoryPath.join(" ").toLowerCase();
    const tags = node.tags.join(" ").toLowerCase();
    const summary = node.summary.toLowerCase();

    let score = 0;
    let matchedAll = true;
    for (const token of tokens) {
      let tokenScore = 0;
      if (title.startsWith(token)) tokenScore += 14;
      else if (title.includes(token)) tokenScore += 9;
      if (citation.includes(token)) tokenScore += 7;
      if (tags.includes(token)) tokenScore += 5;
      if (category.includes(token)) tokenScore += 3;
      if (summary.includes(token)) tokenScore += 2;
      if (String(node.year).includes(token)) tokenScore += 3;
      if (tokenScore === 0) matchedAll = false;
      score += tokenScore;
    }
    if (!matchedAll || score === 0) continue;

    results.push({
      docId: node.id,
      title: node.title,
      citation: node.citation,
      excerpt: excerptFor(node, tokens),
      score: score + Math.min(node.degree, 8) * 0.4,
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
