import type { LiabilityIssue, SearchResult } from "@/lib/types";
import type { AiBudget } from "./ai-budget";
import { COMPLETION_UNITS } from "./ai-budget";
import type { ServerRuntime } from "./runtime";
import { completeJson } from "./openrouter";
import {
  buildAssessmentMessages,
  buildIssueSpottingMessages,
  type RetrievedIssue,
} from "./prompts";
import { retrieve } from "./retrieval";

interface SpottedIssue {
  issue: string;
  facts: string;
  severity: "low" | "medium" | "high";
}

interface IssueResponse {
  issues?: Array<Partial<SpottedIssue>>;
}

interface AssessmentResponse {
  assessments?: Array<{
    index?: number;
    assessment?: string;
    severity?: "low" | "medium" | "high";
  }>;
}

const patterns: Array<{ pattern: RegExp; issue: string; severity: SpottedIssue["severity"] }> = [
  { pattern: /duty|careless|negligen|injur|accident/i, issue: "Negligence and duty of care", severity: "high" },
  { pattern: /\b(?:contract|agreement|breach of contract|payment terms|invoice)\b/i, issue: "Contractual breach", severity: "medium" },
  { pattern: /\b(?:dismissed|wrongful dismissal|workplace injury|employment dispute|unpaid salary)\b/i, issue: "Employment liability", severity: "medium" },
  { pattern: /(?:medical negligence|clinical negligence|misdiagnos|(?:doctor|hospital|clinic).{0,80}negligen|negligen.{0,80}(?:doctor|hospital|clinic))/i, issue: "Medical negligence", severity: "high" },
  { pattern: /director|company|fiduciary|shareholder/i, issue: "Company or director liability", severity: "medium" },
  { pattern: /publish|statement|reputation|defam/i, issue: "Defamation", severity: "medium" },
];

function normalizeSeverity(value: unknown): SpottedIssue["severity"] {
  return value === "low" || value === "high" ? value : "medium";
}

function fallbackIssues(text: string): SpottedIssue[] {
  const found = patterns
    .filter(({ pattern }) => pattern.test(text))
    .slice(0, 5)
    .map(({ issue, severity }) => ({
      issue,
      severity,
      facts: "Potentially relevant facts were detected in the submitted text and require legal review.",
    }));
  return found.length
    ? found
    : [{ issue: "General civil liability", severity: "low", facts: "No specific issue could be classified locally." }];
}

function normalizeIssues(response: IssueResponse, text: string): SpottedIssue[] {
  const issues = (response.issues ?? [])
    .filter((item) => typeof item.issue === "string" && item.issue.trim())
    .slice(0, 5)
    .map((item) => ({
      issue: item.issue!.trim().slice(0, 160),
      facts: typeof item.facts === "string" ? item.facts.trim().slice(0, 800) : "",
      severity: normalizeSeverity(item.severity),
    }));
  return issues.length ? issues : fallbackIssues(text);
}

function precedentSubset(results: SearchResult[]): LiabilityIssue["precedents"] {
  return results.map(({ docId, title, citation, excerpt }) => ({ docId, title, citation, excerpt }));
}

export async function analyzeDeposition(
  runtime: ServerRuntime,
  text: string,
  options: { consent?: boolean; budget?: AiBudget } = {},
): Promise<LiabilityIssue[]> {
  const allowExternal = Boolean(options.consent && runtime.openRouterKey);
  let spotted = fallbackIssues(text);
  if (allowExternal && (await consumeOrSkip(options.budget, COMPLETION_UNITS))) {
    try {
      spotted = normalizeIssues(
        await completeJson<IssueResponse>(
          runtime.openRouterKey!,
          buildIssueSpottingMessages(text),
          { privacy: "no-storage", maxTokens: 1_200 },
        ),
        text,
      );
    } catch {
      // Never retry sensitive testimony without no-storage provider routing.
    }
  }

  const withPrecedents: RetrievedIssue[] = await Promise.all(
    spotted.map(async (issue) => ({
      ...issue,
      precedents: await retrieve(runtime.env, `${issue.issue}: ${issue.facts}`, 3, options.budget),
    })),
  );

  if (!allowExternal || !(await consumeOrSkip(options.budget, COMPLETION_UNITS))) {
    return withPrecedents.map((issue) => ({
      issue: issue.issue,
      severity: issue.severity,
      assessment:
        "Local preview identified this issue heuristically. Review the cited precedents and verify the extracted facts with Singapore counsel.",
      precedents: precedentSubset(issue.precedents),
    }));
  }

  let response: AssessmentResponse;
  try {
    response = await completeJson<AssessmentResponse>(
      runtime.openRouterKey!,
      buildAssessmentMessages(withPrecedents),
      { privacy: "no-storage", maxTokens: 1_600 },
    );
  } catch {
    return withPrecedents.map((issue) => ({
      issue: issue.issue,
      severity: issue.severity,
      assessment:
        "A no-storage model provider was unavailable. This local-only result flags possible issues for counsel to review against the cited precedents.",
      precedents: precedentSubset(issue.precedents),
    }));
  }
  const assessments = new Map(
    (response.assessments ?? [])
      .filter((item) => Number.isInteger(item.index))
      .map((item) => [item.index!, item]),
  );

  return withPrecedents.map((issue, index) => {
    const assessment = assessments.get(index);
    return {
      issue: issue.issue,
      severity: normalizeSeverity(assessment?.severity ?? issue.severity),
      assessment:
        typeof assessment?.assessment === "string" && assessment.assessment.trim()
          ? assessment.assessment.trim().slice(0, 2_000)
          : "The available sources do not support a confident assessment.",
      precedents: precedentSubset(issue.precedents),
    };
  });
}

async function consumeOrSkip(budget: AiBudget | undefined, units: number): Promise<boolean> {
  return budget ? budget.consume(units) : true;
}
