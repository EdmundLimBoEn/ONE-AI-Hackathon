import { errorResponse } from "@/lib/server/errors";
import { completeText } from "@/lib/server/openrouter";
import { buildRagMessages } from "@/lib/server/prompts";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { retrieve } from "@/lib/server/retrieval";
import { getServerRuntime } from "@/lib/server/runtime";
import {
  createSseChatStream,
  localChatText,
  SSE_HEADERS,
} from "@/lib/server/sse";
import { parseJsonBody, validateChatInput } from "@/lib/server/validation";

export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  try {
    const input = validateChatInput(await parseJsonBody(request, 16_384));
    const runtime = getServerRuntime();
    await enforceRateLimit(request, runtime.env);
    const sources = await retrieve(runtime.env, input.query, input.topK);
    const messages = buildRagMessages(input.query, sources, input.systemPrompt);
    const providerText = runtime.openRouterKey
      ? await completeText(runtime.openRouterKey, messages, {
          maxTokens: 1_200,
        })
      : null;
    const stream = createSseChatStream(
      providerText ?? localChatText(input.query, sources),
      sources,
    );
    return new Response(stream, { headers: SSE_HEADERS });
  } catch (error) {
    return errorResponse(error);
  }
}
