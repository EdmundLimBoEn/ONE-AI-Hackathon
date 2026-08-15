import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { rawDocumentSchema, type RawDocument } from "./lib/types";

interface GraphDocument {
  id: string;
  title: string;
  citation: string;
  court: string;
  year: number;
  categoryPath: string[];
  tags: string[];
  summary: string;
  relatedIds: string[];
  sourceUrl: string;
  kind: "judgment";
}

const ROOT = process.cwd();
const RAW_DIR = path.join(ROOT, "pipeline/raw");
const DEMO_SOURCE = path.join(ROOT, "src/components/atlas/lib/demo-corpus.ts");
const OUTPUT = path.join(ROOT, "src/fixtures/recent-corpus.json");

const CATEGORY_ANCHORS: Record<string, string> = {
  "Civil Liability": "spandeck-v-dsta-2007",
  "Commercial Law": "sembcorp-marine-2013",
  "Criminal Law": "penal-code-1871",
  "Family Law": "womens-charter-1961",
  "Employment Law": "employment-act-1968",
  "Constitutional & Administrative Law": "constitution-sg",
  "Property Law": "sit-kwong-lam-2018",
};

function cleanTitle(title: string): string {
  return title
    .replace(/([a-z0-9)])v(?=[A-Z])/g, "$1 v ")
    .replace(/\bv(?=[A-Z])/g, "v ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedCatchwords(doc: RawDocument): string {
  return doc.catchwords
    .join(" — ")
    .replace(/[\[\]]/g, "")
    .replace(/\s*[–—]\s*/g, " — ")
    .replace(/\s+/g, " ")
    .trim();
}

function classify(doc: RawDocument): string {
  const subject = `${normalizedCatchwords(doc)} ${doc.title} ${doc.body.slice(0, 1_200)}`.toLowerCase();
  if (/criminal|public prosecutor|penal code|misuse of drugs|sentenc/.test(subject)) return "Criminal Law";
  if (/family law|matrimonial|divorce|custody|adoption|maintenance|child protection/.test(subject)) return "Family Law";
  if (/employment|employee|industrial relations|wrongful dismissal|salary/.test(subject)) return "Employment Law";
  if (/tort|negligen|personal injur|medical|defam|occupier|duty of care/.test(subject)) return "Civil Liability";
  if (/land\b|property law|landlord|tenant|strata|trusts?\b|conveyanc/.test(subject)) return "Property Law";
  if (/administrative law|judicial review|constitutional|public law|government/.test(subject)) {
    return "Constitutional & Administrative Law";
  }
  if (/intellectual property|trade marks?|copyright|patent/.test(subject)) return "Intellectual Property";
  if (/civil procedure|evidence|courts? and jurisdiction|res judicata/.test(subject)) return "Civil Procedure";
  return "Commercial Law";
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function tagsFor(doc: RawDocument, category: string): string[] {
  const phrases = normalizedCatchwords(doc)
    .split(" — ")
    .map((value) => slug(value))
    .filter((value) => value.length > 2);
  return [...new Set([slug(category), ...phrases])].slice(0, 10);
}

function summaryFor(doc: RawDocument): string {
  const catchwords = normalizedCatchwords(doc);
  if (catchwords) return `Judgment concerning ${catchwords.slice(0, 280)}.`;
  const paragraph = doc.body
    .split(/\n{2,}/)
    .map((value) => value.replace(/^\d+\s+/, "").trim())
    .find((value) => value.length >= 80);
  return (paragraph ?? `Singapore judgment ${doc.citation}.`).slice(0, 320);
}

function citationsIn(body: string): string[] {
  return [...body.matchAll(/\[(\d{4})\]\s+(SG[A-Z()]+)\s+(\d+)/g)].map(
    (match) => `[${match[1]}] ${match[2]} ${match[3]}`,
  );
}

async function main() {
  const demoSource = await readFile(DEMO_SOURCE, "utf8");
  const existing = new Map<string, string>();
  for (const match of demoSource.matchAll(/id:\s*"([^"]+)"[\s\S]*?citation:\s*"([^"]+)"/g)) {
    existing.set(match[2], match[1]);
  }

  const files = (await readdir(RAW_DIR)).filter((file) => file.endsWith(".json")).sort();
  const raw: RawDocument[] = [];
  for (const file of files) {
    const parsed = rawDocumentSchema.safeParse(JSON.parse(await readFile(path.join(RAW_DIR, file), "utf8")));
    if (!parsed.success) continue;
    if (parsed.data.court !== "SGCA" && parsed.data.court !== "SGHC") continue;
    if (existing.has(parsed.data.citation)) continue;
    if (parsed.data.title === parsed.data.citation) continue;
    raw.push(parsed.data);
  }

  const idByCitation = new Map(existing);
  for (const doc of raw) idByCitation.set(doc.citation, doc.id);

  const docs: GraphDocument[] = raw.map((doc) => {
    const category = classify(doc);
    return {
      id: doc.id,
      title: cleanTitle(doc.title),
      citation: doc.citation,
      court: doc.court,
      year: doc.year,
      categoryPath: [category, normalizedCatchwords(doc).split(" — ")[0] || "Recent judgments"],
      tags: tagsFor(doc, category),
      summary: summaryFor(doc),
      relatedIds: [],
      sourceUrl: doc.sourceUrl,
      kind: "judgment",
    };
  });

  const byId = new Map(docs.map((doc) => [doc.id, doc]));
  const rawById = new Map(raw.map((doc) => [doc.id, doc]));
  const byTag = new Map<string, GraphDocument[]>();
  for (const doc of docs) {
    for (const tag of doc.tags.slice(1)) {
      const bucket = byTag.get(tag) ?? [];
      bucket.push(doc);
      byTag.set(tag, bucket);
    }
  }

  for (const doc of docs) {
    const source = rawById.get(doc.id)!;
    const related = new Set<string>();
    for (const citation of citationsIn(source.body)) {
      const target = idByCitation.get(citation);
      if (target && target !== doc.id) related.add(target);
      if (related.size >= 4) break;
    }

    const anchor = CATEGORY_ANCHORS[doc.categoryPath[0]];
    if (anchor && anchor !== doc.id) related.add(anchor);

    for (const tag of doc.tags.slice(1)) {
      const candidates = byTag.get(tag) ?? [];
      const crossTopic = candidates.find(
        (candidate) => candidate.id !== doc.id && candidate.categoryPath[0] !== doc.categoryPath[0],
      );
      if (crossTopic) related.add(crossTopic.id);
      if (related.size >= 7) break;
    }

    if (related.size < 3) {
      const sameTopic = docs.find(
        (candidate) => candidate.id !== doc.id && candidate.categoryPath[0] === doc.categoryPath[0],
      );
      if (sameTopic) related.add(sameTopic.id);
    }
    doc.relatedIds = [...related].filter((id) => existing.has(id) || byId.has(id)).slice(0, 8);
  }

  await writeFile(OUTPUT, `${JSON.stringify(docs, null, 2)}\n`);
  const crossLinks = docs.reduce(
    (count, doc) =>
      count +
      doc.relatedIds.filter((id) => {
        const target = byId.get(id);
        return target && target.categoryPath[0] !== doc.categoryPath[0];
      }).length,
    0,
  );
  console.log(`Wrote ${docs.length} judgments with ${crossLinks} cross-topic links to ${OUTPUT}`);
}

await main();
