import type { LawAtlasEnv } from "@/lib/cloudflare";
import { withTimeout } from "./errors";

export const RETRIEVE_UNITS = 1;
export const COMPLETION_UNITS = 1;
export const MAX_DEPOSITION_ISSUES = 5;

export interface AiBudget {
  consume(units: number): Promise<boolean>;
}

export function depositionWorkUnits(issueCount = MAX_DEPOSITION_ISSUES): number {
  const issues = Math.max(0, Math.min(MAX_DEPOSITION_ISSUES, Math.floor(issueCount)));
  return COMPLETION_UNITS + issues * RETRIEVE_UNITS + COMPLETION_UNITS;
}

export function createMemoryBudget(limit: number): AiBudget & { used: number } {
  const state = { used: 0 };
  return {
    get used() {
      return state.used;
    },
    async consume(units: number) {
      const count = normalizeUnits(units);
      if (count === 0) return true;
      if (state.used + count > limit) return false;
      state.used += count;
      return true;
    },
  };
}

export async function createAiBudget(env: LawAtlasEnv | null): Promise<AiBudget> {
  let closed = false;
  if (env?.AI_CONCURRENCY && !(await limitOrAllow(env.AI_CONCURRENCY, "inflight", "AI concurrency"))) {
    closed = true;
  }

  return {
    async consume(units: number) {
      if (closed) return false;
      const count = normalizeUnits(units);
      if (count === 0) return true;
      if (!env?.AI_BUDGET) return true;
      for (let i = 0; i < count; i++) {
        if (!(await limitOrAllow(env.AI_BUDGET, "global", "AI budget"))) {
          closed = true;
          return false;
        }
      }
      return true;
    },
  };
}

function normalizeUnits(units: number): number {
  if (!Number.isFinite(units) || units <= 0) return 0;
  return Math.min(16, Math.floor(units));
}

async function limitOrAllow(
  limiter: RateLimit,
  key: string,
  label: string,
): Promise<boolean> {
  try {
    const outcome = await withTimeout(limiter.limit({ key }), 2_000, label);
    return outcome.success;
  } catch {
    return true;
  }
}
