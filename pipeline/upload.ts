#!/usr/bin/env bun
import matter from "gray-matter";
import pLimit from "p-limit";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { hasFlag, log, numberOption, option } from "./lib/cli";
import { PIPELINE_ROOT, relativeVaultPath, walk } from "./lib/files";

interface Upload { file: string; key: string }

async function runWrangler(bucket: string, upload: Upload, local: boolean): Promise<void> {
  const contentType = upload.key.endsWith(".json") ? "application/json" : "text/markdown; charset=utf-8";
  const args = ["bunx", "wrangler", "r2", "object", "put", `${bucket}/${upload.key}`, `--file=${upload.file}`, `--content-type=${contentType}`, local ? "--local" : "--remote"];
  const process = Bun.spawn(args, { cwd: join(PIPELINE_ROOT, ".."), stdout: "pipe", stderr: "pipe" });
  const [exitCode, stderr] = await Promise.all([process.exited, new Response(process.stderr).text()]);
  if (exitCode !== 0) throw new Error(`wrangler failed for ${upload.key}: ${stderr.trim().slice(0, 500)}`);
}

export async function collectUploads(vaultDir: string, generatedDir: string): Promise<Upload[]> {
  const uploads: Upload[] = [];
  for (const file of await walk(vaultDir, ".md")) {
    const relative = relativeVaultPath(vaultDir, file);
    const parsed = matter(await readFile(file, "utf8"));
    if (!parsed.data.id) throw new Error(`${relative} has no frontmatter id`);
    uploads.push({ file, key: `vault/${relative}` }, { file, key: `docs/${parsed.data.id}.md` });
  }
  for (const name of ["graph.json", "tree.json"]) {
    const file = join(generatedDir, name);
    if (await Bun.file(file).exists()) uploads.push({ file, key: `indexes/${name}` });
  }
  return uploads;
}

async function main(): Promise<void> {
  if (hasFlag("help")) {
    log("Usage: bun pipeline/upload.ts [--dry-run] [--local] [--bucket NAME] [--concurrency N] [--vault DIR] [--generated DIR]");
    return;
  }
  const bucket = option("bucket", "law-vault")!;
  const vaultDir = resolve(option("vault", join(PIPELINE_ROOT, "vault"))!);
  const generatedDir = resolve(option("generated", join(PIPELINE_ROOT, "generated"))!);
  const uploads = await collectUploads(vaultDir, generatedDir);
  if (!uploads.length) throw new Error("Nothing to upload; run enrich.ts, overviews.ts, and index.ts first");
  if (hasFlag("dry-run")) {
    for (const upload of uploads) log(`[dry-run] ${upload.key} <- ${relativeVaultPath(PIPELINE_ROOT, upload.file)}`);
    log(`Would upload ${uploads.length} objects to R2 bucket ${bucket}.`);
    return;
  }
  const limit = pLimit(Math.max(1, numberOption("concurrency", 3)));
  let done = 0;
  await Promise.all(uploads.map((upload) => limit(async () => {
    await runWrangler(bucket, upload, hasFlag("local"));
    log(`[${++done}/${uploads.length}] ${upload.key}`);
  })));
}

if (import.meta.main) await main();
