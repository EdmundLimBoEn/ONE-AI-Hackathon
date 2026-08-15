import type { SearchResult } from "@/lib/types";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export function renderCitation(source: Pick<SearchResult, "title" | "citation">): string {
  return `[${source.title}${source.citation ? ` ${source.citation}` : ""}]`;
}

export function buildSourceContext(sources: SearchResult[]): string {
  return sources
    .map(
      (source, index) =>
        `SOURCE ${index + 1}\nDocument ID: ${source.docId}\nCitation: ${renderCitation(source)}\nExcerpt: ${source.excerpt}`,
    )
    .join("\n\n");
}

export function buildRagMessages(query: string, sources: SearchResult[]): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are Singapore Law Atlas, a research assistant. Answer only from the supplied sources. " +
        "State uncertainty and do not invent authorities. This is legal information, not legal advice. " +
        "Cite every material legal proposition inline using the exact bracketed Citation value supplied with its source.",
    },
    {
      role: "user",
      content: `Question:\n${query}\n\nSources:\n${buildSourceContext(sources) || "No matching sources were found."}`,
    },
  ];
}

export function buildIssueSpottingMessages(text: string): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "Identify potential Singapore-law liability issues in the supplied deposition or affidavit. " +
        "Do not decide credibility or invent facts. Return JSON only in this shape: " +
        '{"issues":[{"issue":"short label","facts":"relevant facts","severity":"low|medium|high"}]}. ' +
        "Return at most five distinct issues.",
    },
    { role: "user", content: text },
  ];
}

export interface RetrievedIssue {
  issue: string;
  facts: string;
  severity: "low" | "medium" | "high";
  precedents: SearchResult[];
}

export function buildAssessmentMessages(issues: RetrievedIssue[]): ChatMessage[] {
  const material = issues.map((item, index) => ({
    index,
    issue: item.issue,
    facts: item.facts,
    proposedSeverity: item.severity,
    precedents: item.precedents.map((source) => ({
      docId: source.docId,
      citation: renderCitation(source),
      excerpt: source.excerpt,
    })),
  }));

  return [
    {
      role: "system",
      content:
        "Assess each flagged issue under Singapore law using only its supplied precedents. " +
        "Do not invent authorities. Return JSON only in this shape: " +
        '{"assessments":[{"index":0,"assessment":"concise analysis","severity":"low|medium|high"}]}.',
    },
    { role: "user", content: JSON.stringify(material) },
  ];
}
