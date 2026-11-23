import { NextResponse, type NextRequest } from "next/server";
import { getAccessibleContentItem } from "@/features/projects/data";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; contentId: string }> },
) {
  const { projectId, contentId } = await context.params;
  try {
    const item = await getAccessibleContentItem(projectId, contentId);
    if (!item) throw new Error("Content unavailable");
    const destination = item.canEdit ? "" : "/view";
    return NextResponse.redirect(
      new URL(
        `/projects/${projectId}/content/${contentId}${destination}`,
        request.url,
      ),
    );
  } catch {
    return NextResponse.redirect(new URL("/access-denied", request.url));
  }
}
