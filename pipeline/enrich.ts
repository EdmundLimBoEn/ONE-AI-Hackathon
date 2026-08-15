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

function extractLaws(text: string): string[] {
  const laws = new Set<string>();
  for (const match of text.matchAll(
    /\b((?:Civil Law|Penal Code|Evidence|Companies|Employment|Misuse of Drugs|Women'?s Charter|International Arbitration|Insolvency, Restructuring and Dissolution|Building Maintenance and Strata Management|Defamation|Application of English Law)\s+Act(?:\s+\d{4})?)\b(?:[^.\n]{0,80}?\b(?:s|ss|section|sections)\s*([\dA-Za-z,\-–—\s]+))?/gi,
  )) {
    const statute = match[1].replace(/\s+/g, " ").trim();
    const sections = match[2]?.replace(/\s+/g, " ").trim();
    laws.add(sections ? `${statute} — s/ss ${sections}` : statute);
  }
  for (const match of text.matchAll(/\bArt(?:icle)?s?\s+(\d+[A-Za-z]?)\b[^.\n]{0,40}\bConstitution\b/gi)) {
    laws.add(`Constitution of the Republic of Singapore — Art ${match[1]}`);
  }
  if (/duty of care|negligen|contributory/i.test(text)) {
    laws.add("Civil Law Act 1909 — s 3 (contributory negligence); ss 20–21 (dependency claims)");
  }
  if (/traffick|controlled drug|wilful blindness|misuse of drugs/i.test(text)) {
    laws.add("Misuse of Drugs Act 1973 — ss 5, 17, 18 (trafficking, presumptions of trafficking/possession/knowledge)");
  }
  if (/matrimonial asset|division of assets|women'?s charter/i.test(text)) {
    laws.add("Women's Charter 1961 — s 112 (just and equitable division)");
  }
  return [...laws].slice(0, 8);
}

function offlineEnrichment(doc: RawDocument, candidates: RawDocument[], seed?: SeedCase): Enrichment {
  const haystack = `${doc.title} ${doc.catchwords.join(" ")} ${doc.body.slice(0, 4000)}`;
  const rule = topicRules.find(([pattern]) => pattern.test(haystack));
  const categoryPath = seed?.categoryPath ?? rule?.[1] ?? ["Uncategorised", "Judgments"];
  const catchwordTags = doc.catchwords.flatMap((item) => item.split(/[—–:]/)).map(safeSlug).filter((tag) => tag.length > 2);
  const tags = [...new Set([...(seed?.tags ?? []), ...(rule?.[2] ?? []), ...catchwordTags])].slice(0, 12);
  const paragraphs = doc.body
    .split(/\n{2,}/)
    .map((value) => value.replace(/^\d+\s+/, "").replace(/\s+/g, " ").trim())
    .filter((value) => value.length >= 60 && !/mobile and web-friendly/i.test(value));
  const sentences = doc.body.match(/[^.!?]+[.!?]+/g)?.map((value) => value.trim()) ?? [doc.body.slice(0, 900)];
  const narrative = (paragraphs[0] ?? sentences.slice(0, 4).join(" ")).slice(0, 700);
  const issues = doc.catchwords.join("; ") || tags.slice(0, 4).join(", ");
  const laws = extractLaws(`${doc.title} ${doc.catchwords.join(" ")} ${doc.body.slice(0, 12_000)}`);
  const summary = (
    `${doc.citation} (${doc.court}) is a real Singapore judgment in ${doc.title}. ` +
    `It concerns ${issues}. ${narrative} ` +
    (laws.length ? `Relevant laws and sections engaged include: ${laws.join("; ")}.` : "")
  ).replace(/\s+/g, " ").trim().slice(0, 1_200);
  return {
    summary: summary.length >= 20 ? summary : `Judgment of the ${doc.court} in ${doc.citation}. ${doc.body.slice(0, 500)}`,
    holdings: sentences.filter((sentence) => /court|held|consider|reject|adopt|award|find/i.test(sentence)).slice(0, 5).map((sentence) => sentence.slice(0, 450)).length
      ? sentences.filter((sentence) => /court|held|consider|reject|adopt|award|find/i.test(sentence)).slice(0, 5).map((sentence) => sentence.slice(0, 450))
      : [sentences[0].slice(0, 450)],
    tags: tags.length ? tags : ["singapore-law"],
    categoryPath,
    relatedIds: candidates.slice(0, 5).map(({ id }) => id),
    laws,
  };
}

function promptFor(doc: RawDocument, candidates: RawDocument[], seed?: SeedCase): string {
  return `Enrich this REAL Singapore judgment for a public legal research knowledge map. Do not invent parties, holdings, or citations.

Return JSON with exactly:
- summary (180–220 words: what the case is, procedural posture, core facts, holdings, and how a researcher would use it)
- holdings (array of concrete legal propositions / precedents set)
- laws (array of strings naming real statutes and sections applied or discussed, e.g. "Civil Law Act 1909 s 3", "Penal Code 1871 s 304A")
- tags (lowercase kebab-case array)
- categoryPath (array beginning Criminal Law or Civil Liability)
- relatedIds (only IDs from candidates)
- quickSummary (2–3 sentences for a footer card: what it is + usable precedent)

Do not give legal advice. Use only the supplied judgment text.

Citation: ${doc.citation}
Title: ${doc.title}
Catchwords: ${doc.catchwords.join("; ")}
Preferred category if suitable: ${seed?.categoryPath.join(" > ") ?? "none"}
Candidates:
${candidates.map((item) => `- ${item.id}: ${item.title} ${item.citation}`).join("\n")}

Judgment excerpt:
${doc.body.slice(0, 18_000)}`;
}

function renderMarkdown(doc: RawDocument, enrichment: Enrichment, candidates: RawDocument[]): string {
  const names = new Map(candidates.map((candidate) => [candidate.id, candidate.title]));
  const laws = enrichment.laws?.length ? enrichment.laws : extractLaws(`${doc.catchwords.join(" ")} ${doc.body.slice(0, 8_000)}`);
  const data = {
    id: doc.id, title: doc.title, citation: doc.citation, court: doc.court, year: doc.year,
    categoryPath: enrichment.categoryPath, tags: enrichment.tags, summary: enrichment.summary,
    relatedIds: enrichment.relatedIds, sourceUrl: doc.sourceUrl, kind: "judgment",
  };
  const holdings = enrichment.holdings.map((holding) => `- ${holding}`).join("\n");
  const related = enrichment.relatedIds.length
    ? enrichment.relatedIds.map((id) => `- [[${id}|${names.get(id) ?? id}]]`).join("\n")
    : "_No related precedents identified in this corpus yet._";
  const lawsBlock = laws.length
    ? laws.map((law) => `- ${law}`).join("\n")
    : "- _No statute sections extracted from the judgment text; check the full reasons._";
  const firstHolding = enrichment.holdings[0] ?? enrichment.summary.split(/(?<=\.)\s+/)[0];
  const quickSummary =
    enrichment.quickSummary?.trim() ||
    `Quick summary: ${doc.citation} is a ${doc.court} decision in ${doc.title}. ${firstHolding} ${
      laws[0] ? `Statutory touchpoint: ${laws[0]}.` : ""
    }`.replace(/\s+/g, " ").trim();
  const body = `# ${doc.title}

> ${doc.citation} · ${doc.court}

## Summary

${enrichment.summary}

## Relevant laws and sections

${lawsBlock}

## Holdings

${holdings}

## Related precedents

${related}

## Judgment text

${doc.body}

---

[Original judgment](${doc.sourceUrl})

---

### Quick summary

${quickSummary}
`;
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
