import matter from "gray-matter";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import type { RawDocument, VaultMeta } from "./types";
import { rawDocumentSchema } from "./types";

export const PIPELINE_ROOT = join(import.meta.dir, "..");

export async function ensureParent(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await ensureParent(path);
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export async function walk(dir: string, extension?: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path, extension);
    return !extension || extname(path) === extension ? [path] : [];
  }));
  return files.flat().sort();
}

export async function loadRawDocuments(dir = join(PIPELINE_ROOT, "raw")): Promise<RawDocument[]> {
  const files = await walk(dir, ".json");
  const docs: RawDocument[] = [];
  for (const file of files) {
    if (file.endsWith("manifest.json") || file.endsWith("progress.json")) continue;
    docs.push(rawDocumentSchema.parse(await readJson(file)));
  }
  return docs;
}

export async function loadVault(dir = join(PIPELINE_ROOT, "vault")): Promise<Array<{ path: string; meta: VaultMeta; content: string }>> {
  const files = await walk(dir, ".md");
  return Promise.all(files.map(async (path) => {
    const parsed = matter(await readFile(path, "utf8"));
    return { path, meta: parsed.data as VaultMeta, content: parsed.content };
  }));
}

export function relativeVaultPath(root: string, file: string): string {
  return relative(root, file).split("\\").join("/");
}
