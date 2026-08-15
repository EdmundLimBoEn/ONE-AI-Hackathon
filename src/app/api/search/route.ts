import { createAiBudget } from "@/lib/server/ai-budget";
import { errorResponse } from "@/lib/server/errors";
import { retrieve } from "@/lib/server/retrieval";
import { getServerRuntime } from "@/lib/server/runtime";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { parseJsonBody, validateSearchInput } from "@/lib/server/validation";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = validateSearchInput(await parseJsonBody(request, 4_096));
    const runtime = getServerRuntime();
    await enforceRateLimit(request, runtime.env);
    const budget = await createAiBudget(runtime.env);
    const results = await retrieve(runtime.env, input.query, input.topK, budget);
    return Response.json({ query: input.query, results });
  } catch (error) {
    return errorResponse(error);
  }
}
