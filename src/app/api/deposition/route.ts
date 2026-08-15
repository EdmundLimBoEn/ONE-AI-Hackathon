import { createAiBudget } from "@/lib/server/ai-budget";
import { analyzeDeposition } from "@/lib/server/deposition";
import { errorResponse } from "@/lib/server/errors";
import { getServerRuntime } from "@/lib/server/runtime";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import {
  MAX_JSON_BYTES,
  parseJsonBody,
  validateDepositionInput,
} from "@/lib/server/validation";

export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  try {
    const input = validateDepositionInput(await parseJsonBody(request, MAX_JSON_BYTES));
    const runtime = getServerRuntime();
    await enforceRateLimit(request, runtime.env, "deposition");
    const budget = await createAiBudget(runtime.env);
    const issues = await analyzeDeposition(runtime, input.text, {
      consent: input.externalProcessingConsent,
      budget,
    });
    return Response.json({ filename: input.filename ?? null, issues });
  } catch (error) {
    return errorResponse(error);
  }
}
