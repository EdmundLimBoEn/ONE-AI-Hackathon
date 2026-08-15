import graphFixture from "@/fixtures/graph.json";
import type { GraphData, GraphNode, SearchResult } from "@/lib/types";
import type { LawAtlasEnv } from "@/lib/cloudflare";
import { ApiError, withTimeout } from "./errors";

const PRIMARY_EMBEDDING_MODEL = "@cf/baai/bge-m3" as const;
const FALLBACK_EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5" as const;
export const VECTOR_DIMENSIONS = 768;
const graph = graphFixture as unknown as GraphData;
const fixtureById = new Map(graph.nodes.map((node) => [node.id, node]));

function normalizeWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2),
  );
}

function fixtureResult(node: GraphNode, score: number): SearchResult {
  return {
    docId: node.id,
    title: node.title,
    citation: node.citation,
    excerpt: node.summary,
    score,
  };
}

export function searchFixtures(query: string, topK: number): SearchResult[] {
  const queryWords = normalizeWords(query);
  return graph.nodes
    .map((node) => {
      const nodeWords = normalizeWords(
        `${node.title} ${node.citation} ${node.summary} ${node.tags.join(" ")} ${node.categoryPath.join(" ")}`,
      );
      const overlap = [...queryWords].filter((word) => nodeWords.has(word)).length;
      return fixtureResult(node, queryWords.size ? overlap / queryWords.size : 0);
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, topK);
}

export function embeddingFromOutput(output: unknown): number[] | null {
  const candidate = output as { data?: number[][] | number[] };
  if (!Array.isArray(candidate.data)) return null;
  const embedding: unknown[] = Array.isArray(candidate.data[0])
    ? candidate.data[0]
    : candidate.data;
  if (
    !Array.isArray(embedding) ||
    embedding.length === 0 ||
    !embedding.every((value) => typeof value === "number" && Number.isFinite(value))
  ) {
    return null;
  }
  return embedding as number[];
}

export async function embedQuery(env: LawAtlasEnv, query: string): Promise<number[]> {
  const primaryOutput = await withTimeout(
    env.AI.run(PRIMARY_EMBEDDING_MODEL, { text: [query] }),
    12_000,
    "Embedding service",
  );
  const primaryEmbedding = embeddingFromOutput(primaryOutput);
  if (primaryEmbedding?.length === VECTOR_DIMENSIONS) return primaryEmbedding;

  const fallbackOutput = await withTimeout(
    env.AI.run(FALLBACK_EMBEDDING_MODEL, { text: [query] }),
    12_000,
    "Fallback embedding service",
  );
  const fallbackEmbedding = embeddingFromOutput(fallbackOutput);
  if (fallbackEmbedding?.length !== VECTOR_DIMENSIONS) {
    throw new ApiError(
      502,
      "embedding_dimension_mismatch",
      `The embedding service did not return the required ${VECTOR_DIMENSIONS} dimensions.`,
    );
  }
  return fallbackEmbedding;
}

function metadataString(metadata: Record<string, unknown>, key: string): string {
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

export async function retrieve(env: LawAtlasEnv | null, query: string, topK: number): Promise<SearchResult[]> {
  if (!env?.AI || !env.LAW_CORPUS) return searchFixtures(query, topK);

  const vector = await embedQuery(env, query);
  const matches = await withTimeout(
    env.LAW_CORPUS.query(vector, { topK, returnMetadata: "all", returnValues: false }),
    12_000,
    "Vector search",
  );

  const results = matches.matches.map((match) => {
    const metadata = (match.metadata ?? {}) as Record<string, unknown>;
    const docId = metadataString(metadata, "docId") || match.id.split("#")[0];
    const fixture = fixtureById.get(docId);
    return {
      docId,
      title: metadataString(metadata, "title") || fixture?.title || docId,
      citation: metadataString(metadata, "citation") || fixture?.citation || "",
      excerpt:
        metadataString(metadata, "chunk") ||
        metadataString(metadata, "excerpt") ||
        metadataString(metadata, "text") ||
        fixture?.summary ||
        "",
      score: Number.isFinite(match.score) ? match.score : 0,
    };
  });
  return results.length > 0 ? results : searchFixtures(query, topK);
}
