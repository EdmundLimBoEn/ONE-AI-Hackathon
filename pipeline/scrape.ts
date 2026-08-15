#!/usr/bin/env bun
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { hasFlag, log, numberOption, option, sleep } from "./lib/cli";
import { PIPELINE_ROOT, readJson, writeJson } from "./lib/files";
import { idFromUrl, parseJudgmentHtml, parseListingHtml } from "./lib/elitigation";
import type { RawDocument, SeedCase } from "./lib/types";

const USER_AGENT = "SingaporeLawAtlas/0.1 (educational non-commercial research; contact: repository maintainer)";
const BASE = "https://www.elitigation.sg";

async function fetchText(url: string, attempts = 3): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html" }, redirect: "follow" });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      await sleep(1_000 * 2 ** attempt);
    }
  }
  throw new Error(`Failed to fetch ${url}: ${lastError instanceof Error ? lastError.message : "unknown error"}`);
}

async function cacheJudgment(url: string, rawDir: string, htmlDir: string, delayMs: number): Promise<RawDocument | undefined> {
  const id = idFromUrl(url);
  const jsonPath = join(rawDir, `${id}.json`);
  if (await Bun.file(jsonPath).exists()) return readJson<RawDocument>(jsonPath);
  const htmlPath = join(htmlDir, `${id}.html`);
  let html: string;
  if (await Bun.file(htmlPath).exists()) html = await readFile(htmlPath, "utf8");
  else {
    html = await fetchText(url);
    await mkdir(htmlDir, { recursive: true });
    await writeFile(htmlPath, html, "utf8");
    await sleep(delayMs);
  }
  try {
    const doc = parseJudgmentHtml(html, url);
    await writeJson(jsonPath, doc);
    return doc;
  } catch (error) {
    log(`skip ${url}: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

async function main(): Promise<void> {
  if (hasFlag("help")) {
    log("Usage: bun pipeline/scrape.ts [--pilot | --target N] [--recent-pages N] [--delay-ms N] [--offline] [--out DIR] [--seeds FILE]");
    log("Live mode caches HTML and parsed JSON and waits at least 750 ms between requests. --pilot is equivalent to --target 20.");
    return;
  }
  const target = hasFlag("pilot") ? 20 : numberOption("target", 300);
  const delayMs = Math.max(numberOption("delay-ms", 1_500), 750);
  const rawDir = resolve(option("out", join(PIPELINE_ROOT, "raw"))!);
  const htmlDir = join(rawDir, "html");
  const seedPath = resolve(option("seeds", join(PIPELINE_ROOT, "config", "seeds.json"))!);
  const seeds = await readJson<SeedCase[]>(seedPath);
  const urls = new Set(seeds.map((seed) => seed.url));

  if (hasFlag("offline")) {
    const fixtureDir = resolve(option("fixtures", join(PIPELINE_ROOT, "fixtures", "raw"))!);
    const fixtures = (await Array.fromAsync(new Bun.Glob("*.json").scan({ cwd: fixtureDir, absolute: true }))).slice(0, target);
    await mkdir(rawDir, { recursive: true });
    for (const fixture of fixtures) await Bun.write(join(rawDir, basename(fixture)), Bun.file(fixture));
    log(`Copied ${fixtures.length} offline fixture document(s) to ${rawDir}`);
    return;
  }

  const recentPages = numberOption("recent-pages", Math.ceil(Math.max(0, target - urls.size) / 10));
  for (let page = 1; page <= recentPages && urls.size < target * 2; page++) {
    const listingUrl = `${BASE}/gd/Home/Index?Filter=SUPCT&YearOfDecision=All&SortBy=DateOfDecision&CurrentPage=${page}&SortAscending=False&PageSize=0`;
    try {
      const listing = await fetchText(listingUrl);
      for (const item of parseListingHtml(listing)) urls.add(item.url);
      await sleep(delayMs);
    } catch (error) {
      log(`listing page ${page} failed; continuing with collected URLs (${error instanceof Error ? error.message : error})`);
      break;
    }
  }

  await mkdir(rawDir, { recursive: true });
  const docs: RawDocument[] = [];
  for (const url of [...urls]) {
    if (docs.length >= target) break;
    const doc = await cacheJudgment(url, rawDir, htmlDir, delayMs);
    if (doc && ["SGCA", "SGHC", "SGHCI"].includes(doc.court)) {
      docs.push(doc);
      log(`[${docs.length}/${target}] ${doc.citation} ${doc.title}`);
    }
  }
  await writeJson(join(rawDir, "manifest.json"), { generatedAt: new Date().toISOString(), target, count: docs.length, documents: docs.map(({ id, citation, sourceUrl }) => ({ id, citation, sourceUrl })) });
  if (docs.length < target) log(`Collected ${docs.length}/${target}; rerun later to resume from the HTML/JSON cache.`);
}

if (import.meta.main) await main();

export { fetchText };
