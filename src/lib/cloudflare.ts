import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface LawAtlasEnv {
  LAW_VAULT: R2Bucket;
  LAW_CORPUS: VectorizeIndex;
  AI: Ai;
  AI_RATE_LIMIT: RateLimit;
  DEPOSITION_RATE_LIMIT: RateLimit;
  OPENROUTER_API_KEY: string;
}

export function getLawAtlasEnv(): LawAtlasEnv {
  return getCloudflareContext().env as unknown as LawAtlasEnv;
}
