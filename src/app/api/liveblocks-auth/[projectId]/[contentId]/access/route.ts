import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const routeParamsSchema = z.object({
  projectId: z.string().uuid(),
  contentId: z.string().uuid(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string; contentId: string }> },
) {
  const parsedParams = routeParamsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, contentId } = parsedParams.data;
  const client = await createServerSupabaseClient();
  if (!client) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: item, error: itemError } = await client
    .from("content_items")
    .select("project_id")
    .eq("id", contentId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (itemError || !item) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await client.rpc("revalidate_collaboration_session", {
    p_content_item_id: contentId,
  });
  const access = data?.[0];
  if (error || !access) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json(
    {
      accessMode: access.access_mode,
      expiresAt: access.expires_at,
      revoked: access.revoked,
      reason: access.reason,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
