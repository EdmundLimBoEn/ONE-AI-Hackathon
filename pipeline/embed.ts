#!/usr/bin/env bun
import { join, resolve } from "node:path";
import { hasFlag, log, numberOption, option, safeSlug } from "./lib/cli";
import { ensureParent, loadVault, PIPELINE_ROOT } from "./lib/files";

interface Chunk { id: string; docId: string; title: string; citation: string; text: string }
interface VectorRecord { id: string; values: number[]; metadata: { docId: string; title: string; citation: string; chunk: string } }

export function chunkText(text: string, targetChars = 3_200, overlapChars = 400): string[] {
  const paragraphs = text.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > targetChars) {
      chunks.push(current);
      current = `${current.slice(-overlapChars)}\n\n${paragraph}`;
    } else current += `${current ? "\n\n" : ""}${paragraph}`;
    while (current.length > targetChars * 1.5) {
      chunks.push(current.slice(0, targetChars));
      current = current.slice(Math.max(1, targetChars - overlapChars));
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function chunkId(docId: string, index: number, text: string): string {
  const digest = new Bun.CryptoHasher("sha256").update(text).digest("hex").slice(0, 12);
  return `${safeSlug(docId).slice(0, 40)}-${index}-${digest}`;
}

async function embedBatch(accountId: string, token: string, model: string, texts: string[]): Promise<number[][]> {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: texts }),
  });
  if (!response.ok) throw new Error(`Workers AI returned ${response.status} for ${model}`);
  const payload = await response.json() as { success?: boolean; result?: { data?: number[][] } | number[][]; errors?: Array<{ message: string }> };
  const vectors = Array.isArray(payload.result) ? payload.result : payload.result?.data;
  if (!vectors?.length) throw new Error(payload.errors?.[0]?.message ?? `No embeddings returned by ${model}`);
  return vectors;
}

async function upsert(index: string, path: string): Promise<void> {
  const args = ["bunx", "wrangler", "vectorize", "insert", index, `--file=${path}`];
  const process = Bun.spawn(args, { cwd: join(PIPELINE_ROOT, ".."), stdout: "pipe", stderr: "pipe" });
  const [exitCode, stderr] = await Promise.all([process.exited, new Response(process.stderr).text()]);
  if (exitCode !== 0) throw new Error(`Vectorize insert failed: ${stderr.trim().slice(0, 700)}`);
}

async function main(): Promise<void> {
  if (hasFlag("help")) {
    log("Usage: bun pipeline/embed.ts [--dry-run] [--index NAME] [--model MODEL] [--fallback-model MODEL] [--dimensions N] [--batch-size N] [--vault DIR]");
    return;
  }
  const vaultDir = resolve(option("vault", join(PIPELINE_ROOT, "vault"))!);
  const cacheDir = resolve(option("cache", join(PIPELINE_ROOT, ".cache", "vectors"))!);
  const index = option("index", "law-corpus")!;
  const requestedModel = option("model", "@cf/baai/bge-m3")!;
  const fallbackModel = option("fallback-model", "@cf/baai/bge-base-en-v1.5")!;
  const dimensions = numberOption("dimensions", 768);
  const entries = (await loadVault(vaultDir)).filter(({ meta }) => meta.kind !== "overview");
  const chunks: Chunk[] = entries.flatMap(({ meta, content }) => chunkText(content, numberOption("chunk-chars", 3_200), numberOption("overlap-chars", 400)).map((text, index) => ({
    id: chunkId(meta.id, index, text), docId: meta.id, title: meta.title, citation: meta.citation, text,
  })));
  if (hasFlag("dry-run")) {
    log(`Would embed ${chunks.length} chunks from ${entries.length} documents into ${index} (${dimensions} dimensions).`);
    return;
  }
  const accountId = option("account-id") ?? Bun.env.CLOUDFLARE_ACCOUNT_ID ?? Bun.env.CF_ACCOUNT_ID;
  const token = Bun.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) throw new Error("CLOUDFLARE_ACCOUNT_ID (or --account-id) and CLOUDFLARE_API_TOKEN are required");
  const batchSize = Math.min(100, Math.max(1, numberOption("batch-size", 40)));
  let inserted = 0;
  for (let offset = 0; offset < chunks.length; offset += batchSize) {
    const batch = chunks.slice(offset, offset + batchSize);
    let model = requestedModel;
    let vectors = await embedBatch(accountId, token, model, batch.map(({ text }) => text));
    if (vectors[0]?.length !== dimensions && requestedModel !== fallbackModel) {
      log(`${requestedModel} returned ${vectors[0]?.length ?? 0} dimensions; retrying batch with ${fallbackModel} for the ${dimensions}-dimension index.`);
      model = fallbackModel;
      vectors = await embedBatch(accountId, token, model, batch.map(({ text }) => text));
    }
    if (vectors.length !== batch.length || vectors.some((vector) => vector.length !== dimensions)) {
      throw new Error(`${model} output does not match batch size or configured ${dimensions}-dimension Vectorize index`);
    }
    const records: VectorRecord[] = batch.map((chunk, index) => ({
      id: chunk.id,
      values: vectors[index],
      metadata: { docId: chunk.docId, title: chunk.title, citation: chunk.citation, chunk: chunk.text },
    }));
    const path = join(cacheDir, `batch-${String(offset / batchSize).padStart(4, "0")}.ndjson`);
    await ensureParent(path);
    await Bun.write(path, `${records.map((record) => JSON.stringify(record)).join("\n")}\n`);
    await upsert(index, path);
    inserted += records.length;
    log(`[${inserted}/${chunks.length}] embedded with ${model} and inserted into ${index}`);
  }
}

if (import.meta.main) await main();

export { chunkId };
