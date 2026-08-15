import type { LiabilityIssue } from "@/lib/types";
import type { AtlasIndex } from "@/components/atlas/lib/atlas-data";
import { searchNodes } from "@/components/atlas/lib/search";
import type { ParsedDocument } from "./parse-file";

export interface AnalysisResult {
  issues: LiabilityIssue[];
  summary: string | null;
  source: "live" | "local";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toSeverity(value: unknown): LiabilityIssue["severity"] {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function normaliseIssues(raw: unknown): LiabilityIssue[] {
  const list = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.issues)
      ? raw.issues
      : isRecord(raw) && isRecord(raw.analysis) && Array.isArray(raw.analysis.issues)
        ? raw.analysis.issues
        : [];

  const issues: LiabilityIssue[] = [];
  for (const item of list) {
    if (!isRecord(item)) continue;
    const issue = typeof item.issue === "string" ? item.issue : null;
    if (!issue) continue;
    const precedents = Array.isArray(item.precedents) ? item.precedents : [];
    issues.push({
      issue,
      assessment: typeof item.assessment === "string" ? item.assessment : "",
      severity: toSeverity(item.severity),
      precedents: precedents
        .filter(isRecord)
        .map((precedent) => ({
          docId:
            typeof precedent.docId === "string"
              ? precedent.docId
              : typeof precedent.id === "string"
                ? precedent.id
                : "",
          title: typeof precedent.title === "string" ? precedent.title : "",
          citation: typeof precedent.citation === "string" ? precedent.citation : "",
          excerpt: typeof precedent.excerpt === "string" ? precedent.excerpt : "",
        }))
        .filter((precedent) => precedent.docId && precedent.title),
    });
  }
  return issues;
}

export async function analyseDeposition(
  parsed: ParsedDocument,
  index: AtlasIndex | null,
  signal?: AbortSignal,
): Promise<AnalysisResult> {
  try {
    const response = await fetch("/api/deposition", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: parsed.filename,
        text: parsed.text,
        pages: parsed.pages,
        pageCount: parsed.pageCount,
      }),
      signal,
    });
    if (response.ok) {
      const payload: unknown = await response.json();
      const issues = normaliseIssues(payload);
      if (issues.length > 0) {
        return {
          issues,
          summary:
            isRecord(payload) && typeof payload.summary === "string" ? payload.summary : null,
          source: "live",
        };
      }
    }
  } catch {
    // Fall through to the local heuristic pass.
  }

  return localAnalysis(parsed, index);
}

interface Rule {
  issue: string;
  doctrine: string;
  patterns: RegExp[];
  assessment: (hits: string[]) => string;
}

const RULES: Rule[] = [
  {
    issue: "Occupier's duty and the state of the premises",
    doctrine: "occupiers liability duty of care premises",
    patterns: [
      /\b(wet|slippery|oil|spill|puddle|uneven|broken|defect\w*)\b/gi,
      /\b(floor|stair\w*|walkway|scaffold\w*|platform|corridor)\b/gi,
      /\b(warning sign|barricade|cordon|hazard)\b/gi,
    ],
    assessment: (hits) =>
      `The transcript describes the physical state of the premises (${hits.join(", ")}). Under the unified negligence analysis an occupier owes a duty to take reasonable steps against foreseeable hazards, so the adequacy of inspection and warning is squarely in issue.`,
  },
  {
    issue: "System of work, training and supervision",
    doctrine: "employer negligence system of work supervision training",
    patterns: [
      /\b(training|induction|toolbox|briefing|supervis\w*|instruction)\b/gi,
      /\b(no|never|without|lack\w*|failed to)\b\s+\w{0,12}\b(train\w*|supervis\w*|check\w*|inspect\w*)\b/gi,
      /\b(safety (?:officer|manual|procedure|policy)|risk assessment|permit to work)\b/gi,
    ],
    assessment: (hits) =>
      `Evidence touching the system of work (${hits.join(", ")}) goes to whether a safe system was devised and enforced, not merely written down. Gaps here typically drive the primary liability finding.`,
  },
  {
    issue: "Contractor status, vicarious liability and non-delegable duties",
    doctrine: "vicarious liability independent contractor non-delegable duty",
    patterns: [
      /\b(sub-?contractor|contractor|vendor|agency worker|third part\w+)\b/gi,
      /\b(employed by|works? for|engaged by|reports? to)\b/gi,
    ],
    assessment: (hits) =>
      `References to contracting arrangements (${hits.join(", ")}) raise who bears responsibility for the acts in question. Singapore law does not extend vicarious liability to true independent contractors, so the analysis turns on control and on whether a non-delegable duty attaches.`,
  },
  {
    issue: "Contractual allocation of risk",
    doctrine: "contract indemnity exclusion clause interpretation",
    patterns: [
      /\b(contract|agreement|clause|indemnit\w*|warrant\w*|terms? and conditions)\b/gi,
      /\b(sign\w*|execut\w*|terminat\w*|breach\w*)\b/gi,
    ],
    assessment: (hits) =>
      `The deponent refers to contractual documents (${hits.join(", ")}). A contractual matrix that already allocates this risk is a recognised policy factor against superimposing a duty in tort, and any indemnity or exclusion will need to be construed contextually.`,
  },
  {
    issue: "Causation and the extent of injury",
    doctrine: "causation damages personal injury remoteness",
    patterns: [
      /\b(injur\w*|fracture|surgery|hospital|medical|treatment|diagnos\w*)\b/gi,
      /\b(pain|disab\w*|medical leave|physiotherapy|scar\w*)\b/gi,
      /\b(pre-?existing|previous(?:ly)? injur\w*|earlier accident)\b/gi,
    ],
    assessment: (hits) =>
      `Medical evidence in the transcript (${hits.join(", ")}) will need to be tied to the pleaded breach. Watch for pre-existing conditions, which affect both causation and quantum.`,
  },
  {
    issue: "Contributory conduct of the plaintiff",
    doctrine: "contributory negligence apportionment",
    patterns: [
      /\b(did ?n[o']t (?:wear|use|follow|look)|failed to (?:wear|use|follow))\b/gi,
      /\b(helmet|harness|safety (?:boots|shoes|goggles|gear)|ppe)\b/gi,
      /\b(rush\w*|hurr\w*|shortcut|ignore\w*)\b/gi,
    ],
    assessment: (hits) =>
      `Passages suggesting the plaintiff's own conduct (${hits.join(", ")}) support an apportionment argument. Contributory negligence reduces rather than defeats the claim, so quantify it early.`,
  },
  {
    issue: "Reliability of recollection and evidential gaps",
    doctrine: "evidence credibility witness",
    patterns: [
      /\b(i (?:don'?t|cannot|can'?t|do not) (?:recall|remember)|not sure|i think so|maybe)\b/gi,
      /\b(cctv|camera|log ?book|incident report|photograph\w*|record\w*)\b/gi,
    ],
    assessment: (hits) =>
      `Qualified answers and references to contemporaneous records (${hits.join(", ")}) mark the points where the account is most exposed. Secure the underlying documents before the next tranche of evidence.`,
  },
];

function uniqueMatches(text: string, patterns: RegExp[]): string[] {
  const found = new Set<string>();
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = match[0].trim().toLowerCase();
      if (value.length > 2) found.add(value);
      if (found.size >= 6) break;
    }
  }
  return [...found].slice(0, 4);
}

/**
 * Deterministic keyword pass used when the analysis service is unavailable.
 * It surfaces where to look rather than pretending to be legal advice.
 */
export function localAnalysis(
  parsed: ParsedDocument,
  index: AtlasIndex | null,
): AnalysisResult {
  const text = parsed.text;
  const issues: LiabilityIssue[] = [];

  for (const rule of RULES) {
    const hits = uniqueMatches(text, rule.patterns);
    if (hits.length === 0) continue;

    const precedents = index
      ? searchNodes(index.docsById.values(), rule.doctrine, 3).map((result) => ({
          docId: result.docId,
          title: result.title,
          citation: result.citation,
          excerpt: result.excerpt,
        }))
      : [];

    issues.push({
      issue: rule.issue,
      assessment: rule.assessment(hits),
      severity: hits.length >= 3 ? "high" : hits.length === 2 ? "medium" : "low",
      precedents,
    });
  }

  const order = { high: 0, medium: 1, low: 2 } as const;
  issues.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    issues,
    summary:
      issues.length > 0
        ? `Keyword pass over ${parsed.words.toLocaleString()} words across ${parsed.pageCount} page${
            parsed.pageCount === 1 ? "" : "s"
          } flagged ${issues.length} line${issues.length === 1 ? "" : "s"} of enquiry.`
        : "No recognised liability markers were found in this transcript.",
    source: "local",
  };
}
