import { getDocument } from "@/lib/server/content";
import { ApiError, errorResponse } from "@/lib/server/errors";
import { getServerRuntime } from "@/lib/server/runtime";
import { isValidDocId } from "@/lib/server/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    if (!isValidDocId(id)) throw new ApiError(400, "invalid_document_id", "Invalid document ID.");
    const markdown = await getDocument(getServerRuntime().env, id);
    if (!markdown) throw new ApiError(404, "document_not_found", "Document not found.");
    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        "X-Content-Type-Options": "nosniff",
        "X-Document-Id": id,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
