import { z } from "zod";
import { collaborationSnapshotRequestSchema } from "@/features/collaboration/contracts";
import { createLiveblocksServerClient } from "@/features/collaboration/server";
import { countSnapshotEvidence } from "@/features/collaboration/snapshot-evidence";
import { decodeCollaborationSnapshot } from "@/features/collaboration/snapshot";
import { getAuthorizationForClient } from "@/lib/auth/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const routeParamsSchema = z.object({
  projectId: z.string().uuid(),
  contentId: z.string().uuid(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; contentId: string }> },
) {
  const parsedRoute = routeParamsSchema.safeParse(await context.params);
  if (!parsedRoute.success) {
    return Response.json({ error: "Snapshot unavailable." }, { status: 400 });
  }
  const { projectId, contentId } = parsedRoute.data;
  const parsedParams = collaborationSnapshotRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsedParams.success) {
    return Response.json(
      { error: "Invalid snapshot request." },
      { status: 400 },
    );
  }

  const client = await createServerSupabaseClient();
  if (!client) {
    return Response.json({ error: "Snapshot unavailable." }, { status: 401 });
  }

  const authorization = await getAuthorizationForClient(client);
  if (authorization.kind !== "active") {
    return Response.json({ error: "Snapshot unavailable." }, { status: 401 });
  }

  const [
    { data: item, error: itemError },
    { data: collaboration, error: collaborationError },
    { data: capabilities, error: capabilitiesError },
    { data: assignments, error: assignmentsError },
  ] = await Promise.all([
    client
      .from("content_items")
      .select("id,organization_id,project_id,status,record_version")
      .eq("id", contentId)
      .eq("project_id", projectId)
      .maybeSingle(),
    client
      .from("collaboration_documents")
      .select("organization_id,project_id,room_id,document_revision")
      .eq("content_item_id", contentId)
      .maybeSingle(),
    client.rpc("get_collaboration_capabilities", {
      p_content_item_id: contentId,
    }),
    client
      .from("project_assignments")
      .select("id,role,starts_at,ends_at,revoked_at")
      .eq("project_id", projectId)
      .eq("membership_id", authorization.membershipId),
  ]);

  const now = Date.now();
  const currentAssignments = (assignments ?? []).filter(
    (assignment) =>
      !assignment.revoked_at &&
      Date.parse(assignment.starts_at) <= now &&
      (!assignment.ends_at || Date.parse(assignment.ends_at) > now),
  );

  const { data: writerResponsibilities, error: responsibilitiesError } =
    currentAssignments.length > 0
      ? await client
          .from("content_item_assignments")
          .select("project_assignment_id,revoked_at")
          .eq("content_item_id", contentId)
          .eq("responsibility", "writer")
          .is("revoked_at", null)
          .in(
            "project_assignment_id",
            currentAssignments.map((assignment) => assignment.id),
          )
      : { data: [], error: null };

  const writerAssignment = currentAssignments.find((assignment) =>
    (writerResponsibilities ?? []).some(
      (responsibility) =>
        responsibility.project_assignment_id === assignment.id,
    ),
  );

  if (
    itemError ||
    collaborationError ||
    capabilitiesError ||
    assignmentsError ||
    responsibilitiesError ||
    !item ||
    !collaboration ||
    !writerAssignment ||
    item.organization_id !== authorization.organizationId ||
    collaboration.organization_id !== authorization.organizationId ||
    collaboration.project_id !== projectId ||
    capabilities?.[0]?.access_mode !== "write" ||
    !["draft", "changes_requested"].includes(item.status)
  ) {
    return Response.json({ error: "Snapshot unavailable." }, { status: 403 });
  }

  try {
    const liveblocks = createLiveblocksServerClient();
    const version = await liveblocks.createVersionHistorySnapshot(
      collaboration.room_id,
    );
    const binary = await liveblocks.getYjsVersion({
      roomId: collaboration.room_id,
      versionId: version.data.id,
    });
    if (!(binary instanceof ArrayBuffer) || binary.byteLength === 0) {
      return Response.json({ error: "Snapshot unavailable." }, { status: 409 });
    }
    const snapshot = decodeCollaborationSnapshot(binary);
    const counts = countSnapshotEvidence(snapshot.plainText);
    const serviceRoleClient = createServiceRoleSupabaseClient();
    if (!serviceRoleClient) {
      return Response.json({ error: "Snapshot unavailable." }, { status: 503 });
    }

    const { data: captionVersionId, error } = await serviceRoleClient.rpc(
      "finalize_collaboration_snapshot",
      {
        p_actor_user_id: authorization.userId,
        p_organization_id: authorization.organizationId,
        p_project_id: projectId,
        p_project_assignment_id: writerAssignment.id,
        p_content_item_id: contentId,
        p_template_id: parsedParams.data.templateId,
        p_room_id: collaboration.room_id,
        p_expected_item_record_version: item.record_version,
        p_expected_document_revision: collaboration.document_revision,
        p_snapshot_version_id: version.data.id,
        p_editor_json: snapshot.editorJson,
        p_plain_text: snapshot.plainText,
        p_normalized_text: snapshot.normalizedText,
        p_snapshot_hash: snapshot.snapshotHash,
        p_word_count: counts.wordCount,
        p_grapheme_count: counts.graphemeCount,
      },
    );

    if (error || !captionVersionId) {
      return Response.json({ error: "Snapshot unavailable." }, { status: 409 });
    }

    return Response.json({
      captionVersionId,
      snapshotHash: snapshot.snapshotHash,
    });
  } catch {
    return Response.json({ error: "Snapshot unavailable." }, { status: 503 });
  }
}
