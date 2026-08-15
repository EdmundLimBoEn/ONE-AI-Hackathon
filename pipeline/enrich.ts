#!/usr/bin/env bun
import matter from "gray-matter";
import pLimit from "p-limit";
import { join, resolve } from "node:path";
import { hasFlag, log, numberOption, option, safeSlug } from "./lib/cli";
import { ensureParent, loadRawDocuments, PIPELINE_ROOT, readJson, writeJson } from "./lib/files";
import { callOpenRouter, DEFAULT_MODELS } from "./lib/openrouter";
import type { Enrichment, RawDocument, SeedCase } from "./lib/types";

interface ProgressEntry { status: "done" | "failed"; output?: string; error?: string; updatedAt: string }
type Progress = Record<string, ProgressEntry>;

const topicRules: Array<[RegExp, string[], string[]]> = [
  [/medical|doctor|hospital|informed consent/i, ["Civil Liability", "Medical Negligence"], ["medical-negligence", "standard-of-care"]],
  [/employment|employee|employer|dismissal/i, ["Civil Liability", "Employment"], ["employment", "workplace"]],
  [/defamation|libel|slander|publication/i, ["Civil Liability", "Defamation"], ["defamation", "publication"]],
  [/director|company|corporate|shareholder|oppression/i, ["Civil Liability", "Company and Director Liability"], ["company-law", "directors-duties"]],
  [/contract|breach|term|agreement/i, ["Civil Liability", "Contract"], ["contract", "breach"]],
  [/personal injury|damages|accident/i, ["Civil Liability", "Personal Injury"], ["personal-injury", "damages"]],
  [/negligen|duty of care|tort/i, ["Civil Liability", "Negligence"], ["negligence", "duty-of-care"]],
  [/drug|traffick|misuse of drugs/i, ["Criminal Law", "Drugs"], ["drug-offences", "criminal-law"]],
  [/cheat|fraud|corruption|dishonest/i, ["Criminal Law", "White Collar"], ["white-collar", "sentencing"]],
  [/hurt|homicide|murder|assault/i, ["Criminal Law", "Offences Against the Person"], ["offences-against-person", "sentencing"]],
  [/criminal|public prosecutor|sentenc/i, ["Criminal Law", "Sentencing"], ["criminal-law", "sentencing"]],
];

function words(value: string): Set<string> {
  return new Set(value.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? []);
}

function candidatesFor(doc: RawDocument, all: RawDocument[], limit = 8): RawDocument[] {
  const source = words(`${doc.title} ${doc.catchwords.join(" ")} ${doc.body.slice(0, 3000)}`);
  return all.filter((other) => other.id !== doc.id).map((other) => {
    const target = words(`${other.title} ${other.catchwords.join(" ")} ${other.body.slice(0, 1200)}`);
    let overlap = 0;
    for (const token of source) if (target.has(token)) overlap++;
    return { other, score: overlap / Math.sqrt(Math.max(1, source.size * target.size)) };
  }).sort((a, b) => b.score - a.score).slice(0, limit).map(({ other }) => other);
}

function offlineEnrichment(doc: RawDocument, candidates: RawDocument[], seed?: SeedCase): Enrichment {
  const haystack = `${doc.title} ${doc.catchwords.join(" ")} ${doc.body.slice(0, 4000)}`;
  const rule = topicRules.find(([pattern]) => pattern.test(haystack));
  const categoryPath = seed?.categoryPath ?? rule?.[1] ?? ["Uncategorised", "Judgments"];
  const catchwordTags = doc.catchwords.flatMap((item) => item.split(/[—–:]/)).map(safeSlug).filter((tag) => tag.length > 2);
  const tags = [...new Set([...(seed?.tags ?? []), ...(rule?.[2] ?? []), ...catchwordTags])].slice(0, 12);
  const sentences = doc.body.match(/[^.!?]+[.!?]+/g)?.map((value) => value.trim()) ?? [doc.body.slice(0, 900)];
  const summary = sentences.slice(0, 5).join(" ").slice(0, 1_200);
  return {
    summary: summary.length >= 20 ? summary : `Judgment of the ${doc.court} in ${doc.citation}. ${doc.body.slice(0, 500)}`,
    holdings: sentences.filter((sentence) => /court|held|consider|reject|adopt|award|find/i.test(sentence)).slice(0, 5).map((sentence) => sentence.slice(0, 450)).length
      ? sentences.filter((sentence) => /court|held|consider|reject|adopt|award|find/i.test(sentence)).slice(0, 5).map((sentence) => sentence.slice(0, 450))
      : [sentences[0].slice(0, 450)],
    tags: tags.length ? tags : ["singapore-law"],
    categoryPath,
    relatedIds: candidates.slice(0, 5).map(({ id }) => id),
  };
}

function promptFor(doc: RawDocument, candidates: RawDocument[], seed?: SeedCase): string {
  return `Enrich this Singapore judgment for a public legal research knowledge map.\n\nReturn JSON with exactly: summary (about 200 words), holdings (array), tags (lowercase kebab-case array), categoryPath (array beginning Criminal Law or Civil Liability), relatedIds (only IDs from candidates).\nDo not give legal advice. Use only the supplied judgment.\n\nCitation: ${doc.citation}\nTitle: ${doc.title}\nCatchwords: ${doc.catchwords.join("; ")}\nPreferred category if suitable: ${seed?.categoryPath.join(" > ") ?? "none"}\nCandidates:\n${candidates.map((item) => `- ${item.id}: ${item.title} ${item.citation}`).join("\n")}\n\nJudgment excerpt:\n${doc.body.slice(0, 18_000)}`;
}

function renderMarkdown(doc: RawDocument, enrichment: Enrichment, candidates: RawDocument[]): string {
  const names = new Map(candidates.map((candidate) => [candidate.id, candidate.title]));
  const data = {
    id: doc.id, title: doc.title, citation: doc.citation, court: doc.court, year: doc.year,
    categoryPath: enrichment.categoryPath, tags: enrichment.tags, summary: enrichment.summary,
    relatedIds: enrichment.relatedIds, sourceUrl: doc.sourceUrl, kind: "judgment",
  };
  const holdings = enrichment.holdings.map((holding) => `- ${holding}`).join("\n");
  const related = enrichment.relatedIds.length
    ? enrichment.relatedIds.map((id) => `- [[${id}|${names.get(id) ?? id}]]`).join("\n")
    : "_No related precedents identified in this corpus yet._";
  const body = `# ${doc.title}\n\n> ${doc.citation} · ${doc.court}\n\n## Summary\n\n${enrichment.summary}\n\n## Holdings\n\n${holdings}\n\n## Related precedents\n\n${related}\n\n## Judgment text\n\n${doc.body}\n\n---\n\n[Original judgment](${doc.sourceUrl})\n`;
  return matter.stringify(body, data);
}

async function main(): Promise<void> {
  if (hasFlag("help")) {
    log("Usage: bun pipeline/enrich.ts [--offline] [--concurrency N] [--models model,...] [--force] [--raw DIR] [--out DIR]");
    return;
  }
  const rawDir = resolve(option("raw", join(PIPELINE_ROOT, "raw"))!);
  const vaultDir = resolve(option("out", join(PIPELINE_ROOT, "vault"))!);
  const progressPath = resolve(option("progress", join(PIPELINE_ROOT, ".progress", "enrich.json"))!);
  const seeds = await readJson<SeedCase[]>(join(PIPELINE_ROOT, "config", "seeds.json"));
  const seedByCitation = new Map(seeds.map((seed) => [seed.citation, seed]));
  const docs = await loadRawDocuments(rawDir);
  const progress: Progress = await readJson<Progress>(progressPath).catch(() => ({} as Progress));
  const offline = hasFlag("offline");
  const apiKey = Bun.env.OPENROUTER_API_KEY;
  if (!offline && !apiKey) throw new Error("OPENROUTER_API_KEY is required unless --offline is used");
  const models = option("models")?.split(",").filter(Boolean) ?? DEFAULT_MODELS;
  const limit = pLimit(Math.max(1, numberOption("concurrency", 2)));
  const progressWrite = pLimit(1);

  await Promise.all(docs.map((doc) => limit(async () => {
    if (progress[doc.id]?.status === "done" && !hasFlag("force")) return;
    const candidates = candidatesFor(doc, docs);
    try {
      const enrichment = offline
        ? offlineEnrichment(doc, candidates, seedByCitation.get(doc.citation))
        : await callOpenRouter(promptFor(doc, candidates, seedByCitation.get(doc.citation)), { apiKey: apiKey!, models });
      const allowed = new Set(candidates.map(({ id }) => id));
      enrichment.relatedIds = enrichment.relatedIds.filter((id) => allowed.has(id));
      const categoryDir = enrichment.categoryPath.map(safeSlug);
      const output = join(vaultDir, ...categoryDir, `${doc.id}.md`);
      await ensureParent(output);
      await Bun.write(output, renderMarkdown(doc, enrichment, candidates));
      progress[doc.id] = { status: "done", output, updatedAt: new Date().toISOString() };
      await progressWrite(() => writeJson(progressPath, progress));
      log(`enriched ${doc.citation}`);
    } catch (error) {
      progress[doc.id] = { status: "failed", error: error instanceof Error ? error.message : String(error), updatedAt: new Date().toISOString() };
      await progressWrite(() => writeJson(progressPath, progress));
      log(`failed ${doc.citation}: ${progress[doc.id].error}`);
    }
  })));
  const completed = Object.values(progress).filter(({ status }) => status === "done").length;
  log(`Enrichment complete: ${completed}/${docs.length} documents ready.`);
}

if (import.meta.main) await main();

export { candidatesFor, offlineEnrichment, renderMarkdown };
