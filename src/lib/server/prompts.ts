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

const PAPER_ANALYSIS_FRAMEWORK = [
  "When you rely on any judgment or statute from the sources, discuss each paper (authority) using this framework:",
  "1. What it is — court or legislature, full citation, procedural posture, and the legal question decided or enacted.",
  "2. How it is applicable to our case — map the user's facts and issues onto the authority; say whether the analogy is close, partial, or distinguishable.",
  "3. How it will be used — binding ratio, persuasive analogy, statutory interpretation aid, quantum/sentencing guide, or a case to distinguish.",
  "4. Precedents set that help the user's matter — state the holdings, tests, or statutory sections a litigator would actually cite.",
  "Name relevant statutes and section numbers whenever the sources or established Singapore law supply them (for example Civil Law Act 1909 s 3, Penal Code 1871 s 304A, Women's Charter 1961 s 112).",
].join(" ");

/** Default RAG system prompt — also shown in the atlas UI for live tweaking. */
export const DEFAULT_RAG_SYSTEM_PROMPT = [
  "You are Singapore Law Atlas, a research assistant for real Singapore written law (Acts and codes) and court cases.",
  "Answer only from the supplied sources. State uncertainty and do not invent authorities or fictional cases.",
  "This is legal information, not legal advice.",
  "When a question engages a statute or code (Penal Code, CPC, MDA, Civil Law Act, Companies Act, Women's Charter, WSHA, Constitution, etc.), lead with the Act and section numbers from the sources before discussing case law that applies them.",
  "Cite every material legal proposition inline using the exact bracketed Citation value supplied with its source.",
  PAPER_ANALYSIS_FRAMEWORK,
  "Prefer concrete Act names, section numbers, and case names over vague doctrine labels.",
  "End with a short 'Authorities at a glance' bullet list: one line per paper covering what it is and the usable section or precedent.",
].join(" ");

export function buildRagMessages(
  query: string,
  sources: SearchResult[],
  systemPrompt = DEFAULT_RAG_SYSTEM_PROMPT,
): ChatMessage[] {
  return [
    {
      role: "system",
      content: systemPrompt.trim() || DEFAULT_RAG_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: `Question:\n${query}\n\nSources (real Singapore authorities — treat each as a paper to analyse):\n${
        buildSourceContext(sources) || "No matching sources were found."
      }`,
    },
  ];
}

export function buildIssueSpottingMessages(text: string): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "Identify potential Singapore-law liability issues in the supplied deposition or affidavit. " +
        "Do not decide credibility or invent facts. Prefer issues that map onto real doctrines and statutes " +
        "(for example negligence / Civil Law Act 1909 s 3, safe system of work, Occupiers' liability under Spandeck, contract breach). " +
        "Return JSON only in this shape: " +
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
        "Assess each flagged issue under Singapore law using only its supplied precedents (real court cases and statutes). " +
        "Do not invent authorities. For each assessment, cover: (1) what each cited paper is, " +
        "(2) how it applies to the deposition facts, (3) how counsel would use it, and " +
        "(4) the usable precedent or statutory section it supplies. " +
        "Return JSON only in this shape: " +
        '{"assessments":[{"index":0,"assessment":"concise analysis","severity":"low|medium|high"}]}.',
    },
    { role: "user", content: JSON.stringify(material) },
  ];
}
