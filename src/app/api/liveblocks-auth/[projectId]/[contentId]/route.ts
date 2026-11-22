import { z } from "zod";
import { createLiveblocksServerClient } from "@/features/collaboration/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const routeParamsSchema = z.object({
  projectId: z.string().uuid(),
  contentId: z.string().uuid(),
});

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string; contentId: string }> },
) {
  const parsedParams = routeParamsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { projectId, contentId } = parsedParams.data;
  const client = await createServerSupabaseClient();

  if (!client) {
    return new Response("Unauthorized", { status: 401 });
  }

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();
  if (userError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: item, error: itemError } = await client
    .from("content_items")
    .select("project_id")
    .eq("id", contentId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (itemError || !item) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data, error } = await client.rpc("authorize_collaboration_session", {
    p_content_item_id: contentId,
  });
  const authorization = data?.[0];

  if (error || !authorization) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const liveblocks = createLiveblocksServerClient();
    const session = liveblocks.prepareSession(authorization.user_id, {
      organizationId: authorization.organization_id,
      userInfo: {
        name: authorization.display_name,
        accessMode: authorization.access_mode,
        authorizationExpiresAt: authorization.expires_at,
      },
    });
    session.allow(
      authorization.room_id,
      authorization.access_mode === "write"
        ? ["*:write", "comments:none"]
        : ["*:read", "comments:none"],
    );

    const authResponse = await session.authorize();
    return new Response(authResponse.body, {
      status: authResponse.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
}
