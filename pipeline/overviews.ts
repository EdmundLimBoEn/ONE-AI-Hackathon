#!/usr/bin/env bun
import matter from "gray-matter";
import { dirname, join, relative, resolve, sep } from "node:path";
import { hasFlag, log, option, safeSlug } from "./lib/cli";
import { ensureParent, loadVault, PIPELINE_ROOT } from "./lib/files";

interface TopicDoc { id: string; title: string; citation: string; summary: string; tags: string[] }

async function llmIntroduction(topic: string, docs: TopicDoc[], apiKey: string): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://singapore-law-atlas.pages.dev",
      "X-Title": "Singapore Law Atlas",
    },
    body: JSON.stringify({
      model: option("model", "nvidia/nemotron-3-nano-30b-a3b:free"),
      temperature: 0.15,
      messages: [
        { role: "system", content: "Write a concise, neutral topic introduction for a Singapore legal research atlas. Use only supplied case summaries. No legal advice, headings, or invented citations." },
        { role: "user", content: `Topic: ${topic}\n\nCases:\n${docs.map((doc) => `${doc.citation} ${doc.title}: ${doc.summary}`).join("\n")}` },
      ],
    }),
  });
  if (!response.ok) throw new Error(`OpenRouter returned ${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenRouter returned an empty overview");
  return text;
}

function localIntroduction(topic: string, docs: TopicDoc[]): string {
  const tags = [...new Set(docs.flatMap((doc) => doc.tags))].slice(0, 8).join(", ");
  return `This folder collects ${docs.length} Singapore judgment${docs.length === 1 ? "" : "s"} concerning ${topic}. The materials currently emphasise ${tags || "the principal cases and legal tests in this topic"}. Start with the cases below, then follow their related-precedent links and backlinks to move across the atlas.`;
}

async function main(): Promise<void> {
  if (hasFlag("help")) {
    log("Usage: bun pipeline/overviews.ts [--offline | --llm] [--model MODEL] [--vault DIR]");
    return;
  }
  const vaultDir = resolve(option("vault", join(PIPELINE_ROOT, "vault"))!);
  const entries = (await loadVault(vaultDir)).filter(({ meta }) => meta.kind !== "overview");
  const groups = new Map<string, TopicDoc[]>();
  for (const entry of entries) {
    for (let depth = 1; depth <= entry.meta.categoryPath.length; depth++) {
      const path = entry.meta.categoryPath.slice(0, depth).join("/");
      const group = groups.get(path) ?? [];
      group.push({ id: entry.meta.id, title: entry.meta.title, citation: entry.meta.citation, summary: entry.meta.summary, tags: entry.meta.tags });
      groups.set(path, group);
    }
  }
  const apiKey = Bun.env.OPENROUTER_API_KEY;
  const useLlm = hasFlag("llm") && !hasFlag("offline");
  if (useLlm && !apiKey) throw new Error("OPENROUTER_API_KEY is required with --llm");

  for (const [topicPath, topicDocs] of groups) {
    const categoryPath = topicPath.split("/");
    const topic = categoryPath.at(-1)!;
    const output = join(vaultDir, ...categoryPath.map(safeSlug), "_overview.md");
    let intro = localIntroduction(topic, topicDocs);
    if (useLlm) {
      try {
        intro = await llmIntroduction(topic, topicDocs.slice(0, 30), apiKey!);
      } catch (error) {
        log(`overview ${topic} used local fallback: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    const childFolders = [...new Set(entries
      .filter(({ meta }) => meta.categoryPath.slice(0, categoryPath.length).join("/") === topicPath && meta.categoryPath.length > categoryPath.length)
      .map(({ meta }) => meta.categoryPath[categoryPath.length]))].sort();
    const data = {
      id: `overview-${categoryPath.map(safeSlug).join("-")}`,
      title: `${topic} overview`,
      citation: "Topic overview",
      court: "Atlas",
      year: new Date().getUTCFullYear(),
      categoryPath,
      tags: ["overview", safeSlug(topic)],
      summary: intro.replace(/\s+/g, " ").slice(0, 500),
      relatedIds: topicDocs.map(({ id }) => id).slice(0, 20),
      kind: "overview",
    };
    const folders = childFolders.length ? `## Subtopics\n\n${childFolders.map((name) => `- **${name}**`).join("\n")}\n\n` : "";
    const cases = topicDocs.sort((a, b) => a.citation.localeCompare(b.citation)).map((doc) => `- [[${doc.id}|${doc.title}]] — ${doc.citation}`).join("\n");
    await ensureParent(output);
    await Bun.write(output, matter.stringify(`# ${topic}\n\n${intro}\n\n${folders}## Key cases\n\n${cases}\n`, data));
    log(`overview ${relative(vaultDir, dirname(output)).split(sep).join("/") || "."}`);
  }
}

if (import.meta.main) await main();

export { localIntroduction };
