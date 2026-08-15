import type { SearchResult } from "@/lib/types";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export function renderCitation(source: Pick<SearchResult, "title" | "citation">): string {
  return `[${source.title}${source.citation ? ` ${source.citation}` : ""}]`;
}

/** Wikilink the UI can turn into a one-click open in the atlas reader. */
export function renderWikilink(source: Pick<SearchResult, "docId" | "title" | "citation">): string {
  const label = source.citation
    ? `${shortLabel(source.title)} ${source.citation}`
    : shortLabel(source.title);
  return `[[${source.docId}|${label}]]`;
}

function shortLabel(title: string): string {
  const cleaned = title.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 48) return cleaned;
  const v = cleaned.match(/^(.+?)\s+v(?:ersus)?\s+/i);
  if (v?.[1] && v[1].length >= 4 && v[1].length <= 40) return v[1].trim();
  return `${cleaned.slice(0, 45).trim()}…`;
}

export function buildSourceContext(sources: SearchResult[]): string {
  return sources
    .map((source, index) => {
      const wiki = renderWikilink(source);
      return [
        `SOURCE ${index + 1}`,
        `Document ID: ${source.docId}`,
        `Wikilink (use this form in your answer): ${wiki}`,
        `Citation label: ${renderCitation(source)}`,
        `Excerpt: ${source.excerpt}`,
      ].join("\n");
    })
    .join("\n\n");
}

const PAPER_ANALYSIS_FRAMEWORK = [
  "When you rely on any judgment or statute from the sources, discuss each paper (authority) using this framework:",
  "1. What it is — court or legislature, full citation, procedural posture, and the legal question decided or enacted.",
  "2. How it is applicable to our case — map the user's facts and issues onto the authority; say whether the analogy is close, partial, or distinguishable.",
  "3. How it will be used — binding ratio, persuasive analogy, statutory interpretation aid, quantum/sentencing guide, or a case to distinguish.",
  "4. Precedents set that help the user's matter — the holdings, tests, or statutory sections a litigator would actually cite.",
  "Name relevant statutes and section numbers whenever the sources supply them (for example Civil Law Act 1909 s 3, Penal Code 1871 s 304A, Women's Charter 1961 s 112).",
].join(" ");

/**
 * Fixed RAG system prompt for Atlas counsel (lawyer-facing product — not user-editable).
 * Inline cites must use [[docId|label]] so the chat renderer can open the paper.
 */
export const DEFAULT_RAG_SYSTEM_PROMPT = [
  "You are Singapore Law Atlas, a legal research system for real Singapore written law (Acts and codes) and court cases.",
  "You are not a human, not a companion, and not a sycophant. Do not use conversational filler such as \"You're absolutely right!\", \"Great question!\", \"Happy to help\", or emotional reassurance. Be emotionless, precise, and facts-first.",
  "Answer only from the supplied sources. State uncertainty. Do not invent authorities, Document IDs, holdings, or fictional cases.",
  "This is legal information, not legal advice.",
  "When a question engages a statute or code (Penal Code, CPC, MDA, Civil Law Act, Companies Act, Women's Charter, WSHA, Constitution, etc.), lead with the Act and section numbers from the sources before discussing case law that applies them.",
  "INLINE CITATIONS (required for every material legal proposition in the body of the answer, not only at the end): use the exact atlas wikilink form [[Document ID|short label]] supplied with each SOURCE. Example: [[spandeck-v-dsta-2007|Spandeck [2007] SGCA 37]]. Place the wikilink immediately after the proposition it supports. Only use Document IDs listed in the sources. Do not invent IDs. Plain-text citations alone are not enough.",
  PAPER_ANALYSIS_FRAMEWORK,
  "Analytical discipline: prefer the highest court among the sources when they conflict and say so; separate ratio from dicta; if the user's facts are distinguishable, say why; if sources are thin or silent, say what is missing rather than stretching them; keep the answer structured (direct answer → authorities with inline wikilinks → application → risk/uncertainty).",
  "Prefer concrete Act names, section numbers, and case names over vague doctrine labels.",
  "End with a short 'Authorities at a glance' bullet list. Each bullet must start with a [[Document ID|label]] wikilink, then one line on what the paper is and the usable section or holding.",
].join(" ");

export function buildRagMessages(query: string, sources: SearchResult[]): ChatMessage[] {
  return [
    {
      role: "system",
      content: DEFAULT_RAG_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: `Question:\n${query}\n\nSources (real Singapore authorities — treat each as a paper to analyse; cite with the Wikilink form):\n${
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
      wikilink: renderWikilink(source),
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
        "When naming an authority inside the assessment string, prefer its wikilink form. " +
        "Return JSON only in this shape: " +
        '{"assessments":[{"index":0,"assessment":"concise analysis","severity":"low|medium|high"}]}.',
    },
    { role: "user", content: JSON.stringify(material) },
  ];
}
