import type { LawAtlasEnv } from "@/lib/cloudflare";
import { ApiError, withTimeout } from "./errors";

export async function enforceRateLimit(
  request: Request,
  env: LawAtlasEnv | null,
  kind: "ai" | "deposition" = "ai",
): Promise<void> {
  const limiter = kind === "deposition" ? env?.DEPOSITION_RATE_LIMIT : env?.AI_RATE_LIMIT;
  if (!limiter) return;

  const client = request.headers.get("cf-connecting-ip") ?? "unidentified-client";
  const outcome = await withTimeout(
    limiter.limit({ key: `${kind}:${client}` }),
    2_000,
    "Rate limiter",
  );
  if (!outcome.success) {
    throw new ApiError(429, "rate_limited", "Too many requests. Please try again shortly.");
  }
}
