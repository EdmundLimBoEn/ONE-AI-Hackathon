import { getIndex, type IndexKind } from "@/lib/server/content";
import { ApiError, errorResponse } from "@/lib/server/errors";
import { getServerRuntime } from "@/lib/server/runtime";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> },
): Promise<Response> {
  try {
    const { kind } = await params;
    if (kind !== "graph" && kind !== "tree") {
      throw new ApiError(404, "index_not_found", "Index not found.");
    }
    const data = await getIndex(getServerRuntime().env, kind as IndexKind);
    return Response.json(data, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
