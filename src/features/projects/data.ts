import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthorizationForClient } from "@/lib/auth/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  canCreateContent,
  canEditContent,
  canManageProject,
} from "@/features/projects/policy";
import type {
  ContentKind,
  ControlledTagSlug,
  TaxonomyOption,
} from "@/features/content/taxonomy";
import type {
  ContentResponsibility,
  Database,
  ProjectAssignmentRole,
} from "@/types/database";

export class ProjectAccessError extends Error {
  constructor() {
    super("The project operation could not be completed.");
    this.name = "ProjectAccessError";
  }
}

type ActiveContext = {
  client: SupabaseClient<Database>;
  userId: string;
  membershipId: string;
  organizationId: string;
  roles: Database["public"]["Enums"]["organization_role"][];
};

async function getActiveContext(): Promise<ActiveContext> {
  const client = await createServerSupabaseClient();

  if (!client) {
    throw new ProjectAccessError();
  }

  const decision = await getAuthorizationForClient(client);

  if (decision.kind !== "active") {
    throw new ProjectAccessError();
  }

  return {
    client,
    userId: decision.userId,
    membershipId: decision.membershipId,
    organizationId: decision.organizationId,
    roles: [...decision.roles],
  };
}

export type ProjectSummaryDto = {
  id: string;
  title: string;
  description: string | null;
  recordVersion: number;
  updatedAt: string;
};

export async function listAccessibleProjects(): Promise<{
  projects: ProjectSummaryDto[];
  canCreateProject: boolean;
}> {
  const context = await getActiveContext();
  const { data, error } = await context.client
    .from("projects")
    .select("id,title,description,record_version,updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new ProjectAccessError();
  }

  return {
    projects: (data ?? []).map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      recordVersion: project.record_version,
      updatedAt: project.updated_at,
    })),
    canCreateProject:
      context.roles.includes("publicity_director") ||
      context.roles.includes("org_admin"),
  };
}

export type ProjectDetailDto = ProjectSummaryDto & {
  organizationId: string;
  assignments: {
    id: string;
    membershipId: string;
    role: ProjectAssignmentRole;
    startsAt: string;
    endsAt: string | null;
  }[];
  contentItems: {
    id: string;
    title: string;
    status: Database["public"]["Enums"]["content_status"];
    formatId: number;
    isSpecialCase: boolean;
    updatedAt: string;
  }[];
  canManage: boolean;
  canCreateContent: boolean;
};

export async function getAccessibleProject(
  projectId: string,
): Promise<ProjectDetailDto | null> {
  const context = await getActiveContext();
  const { data: project, error: projectError } = await context.client
    .from("projects")
    .select("id,organization_id,title,description,record_version,updated_at")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    return null;
  }

  const [
    { data: assignments, error: assignmentError },
    { data: contentItems, error: contentError },
  ] = await Promise.all([
    context.client
      .from("project_assignments")
      .select("id,membership_id,role,starts_at,ends_at,revoked_at")
      .eq("project_id", project.id)
      .is("revoked_at", null),
    context.client
      .from("content_items")
      .select("id,title,status,content_format_id,is_special_case,updated_at")
      .eq("project_id", project.id)
      .order("updated_at", { ascending: false }),
  ]);

  if (assignmentError || contentError) {
    throw new ProjectAccessError();
  }

  const currentRoles = (assignments ?? [])
    .filter((assignment) => assignment.membership_id === context.membershipId)
    .map((assignment) => assignment.role);
  const authorizationContext = {
    actorOrganizationId: context.organizationId,
    resourceOrganizationId: project.organization_id,
    organizationRoles: context.roles,
    projectAssignments: currentRoles,
  };

  return {
    id: project.id,
    organizationId: project.organization_id,
    title: project.title,
    description: project.description,
    recordVersion: project.record_version,
    updatedAt: project.updated_at,
    assignments: (assignments ?? []).map((assignment) => ({
      id: assignment.id,
      membershipId: assignment.membership_id,
      role: assignment.role,
      startsAt: assignment.starts_at,
      endsAt: assignment.ends_at,
    })),
    contentItems: (contentItems ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      formatId: item.content_format_id,
      isSpecialCase: item.is_special_case,
      updatedAt: item.updated_at,
    })),
    canManage: canManageProject(authorizationContext),
    canCreateContent: canCreateContent(authorizationContext),
  };
}

export async function getControlledTaxonomy(): Promise<TaxonomyOption[]> {
  const context = await getActiveContext();
  const [formatsResult, tagsResult, pairsResult] = await Promise.all([
    context.client
      .from("content_formats")
      .select("id,slug,display_label")
      .eq("active", true)
      .order("id"),
    context.client
      .from("content_tags")
      .select("id,slug,display_label,emoji")
      .eq("active", true)
      .order("id"),
    context.client
      .from("content_format_tags")
      .select("content_format_id,content_tag_id"),
  ]);

  if (formatsResult.error || tagsResult.error || pairsResult.error) {
    throw new ProjectAccessError();
  }

  const tagsById = new Map((tagsResult.data ?? []).map((tag) => [tag.id, tag]));

  return (formatsResult.data ?? []).map((format) => ({
    kind: format.slug,
    label: format.display_label,
    tags: (pairsResult.data ?? [])
      .filter((pair) => pair.content_format_id === format.id)
      .map((pair) => tagsById.get(pair.content_tag_id))
      .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
      .map((tag) => ({
        slug: tag.slug as ControlledTagSlug,
        label: tag.display_label,
        emoji: tag.emoji,
      })),
  }));
}

export type ContentDetailDto = {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  kind: ContentKind;
  status: Database["public"]["Enums"]["content_status"];
  tags: ControlledTagSlug[];
  isSpecialCase: boolean;
  specialCaseReason: string | null;
  recordVersion: number;
  draft: {
    editorJson: Database["public"]["Tables"]["caption_drafts"]["Row"]["editor_json"];
    plainText: string;
    version: number;
  } | null;
  deliverables: {
    id: string;
    label: string;
    url: string;
    sourceCommittee: string;
    deliverableType: string;
    status: string | null;
  }[];
  responsibilities: {
    id: string;
    projectAssignmentId: string;
    responsibility: ContentResponsibility;
  }[];
  canEdit: boolean;
  canManageDeliverables: boolean;
};

export async function getAccessibleContentItem(
  projectId: string,
  contentItemId: string,
): Promise<ContentDetailDto | null> {
  const context = await getActiveContext();
  const { data: item, error: itemError } = await context.client
    .from("content_items")
    .select(
      "id,organization_id,project_id,title,status,content_format_id,is_special_case,special_case_reason,record_version",
    )
    .eq("id", contentItemId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (itemError || !item) {
    return null;
  }

  const [
    formatsResult,
    itemTagsResult,
    tagsResult,
    deliverablesResult,
    contentAssignmentsResult,
    projectAssignmentsResult,
    draftResult,
  ] = await Promise.all([
    context.client
      .from("content_formats")
      .select("id,slug")
      .eq("id", item.content_format_id)
      .maybeSingle(),
    context.client
      .from("content_item_tags")
      .select("content_tag_id")
      .eq("content_item_id", item.id),
    context.client.from("content_tags").select("id,slug"),
    context.client
      .from("deliverables")
      .select("id,label,url,source_committee,deliverable_type,status")
      .eq("content_item_id", item.id)
      .order("created_at"),
    context.client
      .from("content_item_assignments")
      .select("id,project_assignment_id,responsibility,revoked_at")
      .eq("content_item_id", item.id)
      .is("revoked_at", null),
    context.client
      .from("project_assignments")
      .select("id,membership_id,role,revoked_at")
      .eq("project_id", item.project_id)
      .is("revoked_at", null),
    context.client
      .from("caption_drafts")
      .select("editor_json,plain_text,draft_version")
      .eq("content_item_id", item.id)
      .maybeSingle(),
  ]);

  if (
    formatsResult.error ||
    itemTagsResult.error ||
    tagsResult.error ||
    deliverablesResult.error ||
    contentAssignmentsResult.error ||
    projectAssignmentsResult.error ||
    draftResult.error ||
    !formatsResult.data
  ) {
    throw new ProjectAccessError();
  }

  const actorAssignments = (projectAssignmentsResult.data ?? []).filter(
    (assignment) => assignment.membership_id === context.membershipId,
  );
  const actorAssignmentIds = new Set(
    actorAssignments.map((assignment) => assignment.id),
  );
  const actorResponsibilities = (contentAssignmentsResult.data ?? [])
    .filter((assignment) =>
      actorAssignmentIds.has(assignment.project_assignment_id),
    )
    .map((assignment) => assignment.responsibility);
  const canEditByAssignment = canEditContent({
    actorOrganizationId: context.organizationId,
    resourceOrganizationId: item.organization_id,
    organizationRoles: context.roles,
    projectAssignments: actorAssignments.map((assignment) => assignment.role),
    contentResponsibilities: actorResponsibilities,
  });
  const tagsById = new Map(
    (tagsResult.data ?? []).map((tag) => [
      tag.id,
      tag.slug as ControlledTagSlug,
    ]),
  );

  return {
    id: item.id,
    organizationId: item.organization_id,
    projectId: item.project_id,
    title: item.title,
    kind: formatsResult.data.slug,
    status: item.status,
    tags: (itemTagsResult.data ?? [])
      .map((tag) => tagsById.get(tag.content_tag_id))
      .filter((tag): tag is ControlledTagSlug => Boolean(tag)),
    isSpecialCase: item.is_special_case,
    specialCaseReason: item.special_case_reason,
    recordVersion: item.record_version,
    draft: draftResult.data
      ? {
          editorJson: draftResult.data.editor_json,
          plainText: draftResult.data.plain_text,
          version: draftResult.data.draft_version,
        }
      : null,
    deliverables: (deliverablesResult.data ?? []).map((deliverable) => ({
      id: deliverable.id,
      label: deliverable.label,
      url: deliverable.url,
      sourceCommittee: deliverable.source_committee,
      deliverableType: deliverable.deliverable_type,
      status: deliverable.status,
    })),
    responsibilities: (contentAssignmentsResult.data ?? []).map(
      (assignment) => ({
        id: assignment.id,
        projectAssignmentId: assignment.project_assignment_id,
        responsibility: assignment.responsibility,
      }),
    ),
    canEdit:
      (item.status === "draft" || item.status === "changes_requested") &&
      canEditByAssignment,
    canManageDeliverables:
      context.roles.includes("org_admin") || canEditByAssignment,
  };
}

async function runRpc<T>(
  operation: () => PromiseLike<{ data: T | null; error: unknown }>,
) {
  const { data, error } = await operation();

  if (error || data === null) {
    throw new ProjectAccessError();
  }

  return data;
}

export async function createProject(input: {
  title: string;
  description: string | null;
}) {
  const { client, organizationId } = await getActiveContext();
  return runRpc(() =>
    client.rpc("create_project", {
      p_organization_id: organizationId,
      p_title: input.title,
      p_description: input.description,
    }),
  );
}

export async function updateProject(input: {
  projectId: string;
  expectedVersion: number;
  title: string;
  description: string | null;
}) {
  const { client } = await getActiveContext();
  return runRpc(() =>
    client.rpc("update_project", {
      p_project_id: input.projectId,
      p_expected_version: input.expectedVersion,
      p_title: input.title,
      p_description: input.description,
    }),
  );
}

export async function createContentItem(input: {
  projectId: string;
  title: string;
  kind: ContentKind;
  tags: ControlledTagSlug[];
  isSpecialCase: boolean;
  specialCaseReason: string | null;
}) {
  const { client } = await getActiveContext();
  return runRpc(() =>
    client.rpc("create_content_item", {
      p_project_id: input.projectId,
      p_title: input.title,
      p_format_slug: input.kind,
      p_tag_slugs: input.tags,
      p_is_special_case: input.isSpecialCase,
      p_special_case_reason: input.specialCaseReason,
    }),
  );
}

export async function updateContentItem(input: {
  contentItemId: string;
  expectedVersion: number;
  title: string;
  kind: ContentKind;
  tags: ControlledTagSlug[];
  isSpecialCase: boolean;
  specialCaseReason: string | null;
}) {
  const { client } = await getActiveContext();
  return runRpc(() =>
    client.rpc("update_content_metadata", {
      p_content_item_id: input.contentItemId,
      p_expected_version: input.expectedVersion,
      p_title: input.title,
      p_format_slug: input.kind,
      p_tag_slugs: input.tags,
      p_is_special_case: input.isSpecialCase,
      p_special_case_reason: input.specialCaseReason,
    }),
  );
}

export async function addDeliverable(input: {
  contentItemId: string;
  label: string;
  url: string;
  sourceCommittee: string;
  deliverableType: string;
  status: string | null;
}) {
  const { client } = await getActiveContext();
  return runRpc(() =>
    client.rpc("add_deliverable", {
      p_content_item_id: input.contentItemId,
      p_label: input.label,
      p_url: input.url,
      p_source_committee: input.sourceCommittee,
      p_deliverable_type: input.deliverableType,
      p_status: input.status,
    }),
  );
}

export async function assignProjectMember(input: {
  projectId: string;
  membershipId: string;
  role: ProjectAssignmentRole;
  startsAt?: string;
  endsAt?: string | null;
}) {
  const { client } = await getActiveContext();
  return runRpc(() =>
    client.rpc("assign_project_member", {
      p_project_id: input.projectId,
      p_membership_id: input.membershipId,
      p_role: input.role,
      ...(input.startsAt ? { p_starts_at: input.startsAt } : {}),
      p_ends_at: input.endsAt ?? null,
    }),
  );
}

export async function assignContentResponsibility(input: {
  contentItemId: string;
  projectAssignmentId: string;
  responsibility: ContentResponsibility;
}) {
  const { client } = await getActiveContext();
  return runRpc(() =>
    client.rpc("assign_content_responsibility", {
      p_content_item_id: input.contentItemId,
      p_project_assignment_id: input.projectAssignmentId,
      p_responsibility: input.responsibility,
    }),
  );
}

export async function saveCaptionDraft(input: {
  contentItemId: string;
  expectedVersion: number;
  plainText: string;
}) {
  const { client } = await getActiveContext();
  return runRpc(() =>
    client.rpc(
      "save_caption_draft" as never,
      {
        p_content_item_id: input.contentItemId,
        p_expected_version: input.expectedVersion,
        p_editor_json: { type: "doc", content: [] },
        p_plain_text: input.plainText,
      } as never,
    ),
  );
}

export async function submitCaptionVersion(input: {
  contentItemId: string;
  expectedDraftVersion: number;
}) {
  const { client } = await getActiveContext();
  return runRpc(() =>
    client.rpc(
      "submit_caption_version" as never,
      {
        p_content_item_id: input.contentItemId,
        p_expected_draft_version: input.expectedDraftVersion,
      } as never,
    ),
  );
}
