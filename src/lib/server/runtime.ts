import { getLawAtlasEnv, type LawAtlasEnv } from "@/lib/cloudflare";

export interface ServerRuntime {
  env: LawAtlasEnv | null;
  openRouterKey: string | null;
}

export function getServerRuntime(): ServerRuntime {
  let env: LawAtlasEnv | null = null;
  const useBindings = process.env.NODE_ENV === "production" || process.env.USE_REMOTE_BINDINGS === "true";
  if (useBindings) {
    try {
      env = getLawAtlasEnv();
    } catch {
      // Local Next production servers have no OpenNext request context.
    }
  }

  const boundKey = env?.OPENROUTER_API_KEY?.trim();
  const localKey = process.env.OPENROUTER_API_KEY?.trim();
  return {
    env,
    openRouterKey: boundKey || localKey || null,
  };
}
