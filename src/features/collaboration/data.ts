import "server-only";

import { getAuthorizationForClient } from "@/lib/auth/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CaptionReactionKind,
  CollaborationAccessMode,
  CollaborationSuggestionKind,
  CollaborationSuggestionState,
  Json,
} from "@/types/database";
import type { ContentDetailDto } from "@/features/projects/data";
import type { CollaborationEditorNode } from "@/features/collaboration/contracts";
import { collaborationRoomId } from "@/features/collaboration/room";

export class CollaborationAccessError extends Error {
  constructor() {
    super("The collaboration operation could not be completed.");
    this.name = "CollaborationAccessError";
  }
}

export type CollaborationCommentDto = {
  id: string;
  body: string;
  authorUserId: string;
  authorName: string;
  mentionedUserIds: string[];
  createdAt: string;
};

export type CollaborationThreadDto = {
  id: string;
  anchor: Json;
  createdByUserId: string;
  resolvedAt: string | null;
  comments: CollaborationCommentDto[];
};

export type CollaborationSuggestionDto = {
  id: string;
  authorUserId: string;
  authorName: string;
  kind: CollaborationSuggestionKind;
  anchor: Json;
  sourceText: string;
  replacementText: string;
  state: CollaborationSuggestionState;
  recordVersion: number;
  appliedAt: string | null;
  createdAt: string;
};

export type CollaborationWorkspaceDto = {
  currentUserId: string;
  roomId: string;
  accessMode: CollaborationAccessMode;
  canComment: boolean;
  canSuggest: boolean;
  canReview: boolean;
  canReact: boolean;
  initialContent: CollaborationEditorNode;
  threads: CollaborationThreadDto[];
  suggestions: CollaborationSuggestionDto[];
  mentionOptions: { userId: string; label: string }[];
  workflowTemplates: { id: string; name: string }[];
  latestReview: {
    captionVersionId: string;
    versionNumber: number;
    status: string;
    currentStep: string | null;
    reactions: {
      id: string;
      actorUserId: string;
      actorName: string;
      kind: CaptionReactionKind;
      comment: string | null;
    }[];
    evidence: {
      wordCount: number | null;
      graphemeCount: number | null;
      wordPolicyConfigured: boolean | null;
      wordPolicies: {
        policyId: string;
        policyVersion: string;
        warningState: string;
        recommendedWordLimit: number;
        globalHardMaximumWords: number;
        recommendationExempt: boolean;
        exemptionReason: string | null;
      }[];
      destinations: {
        publicationChannelId: string;
        policyId: string | null;
        policyVersion: string | null;
        label: string;
        graphemeCount: number;
        characterLimit: number | null;
        warningState: string;
      }[];
    };
  } | null;
};

async function getClient() {
  const client = await createServerSupabaseClient();
  if (!client) throw new CollaborationAccessError();
  const authorization = await getAuthorizationForClient(client);
  if (authorization.kind !== "active") throw new CollaborationAccessError();
  return { client, authorization };
}

function defaultDocument(plainText: string): CollaborationEditorNode {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: plainText ? [{ type: "text", text: plainText }] : [],
      },
    ],
  };
}

function initialDocument(item: ContentDetailDto): CollaborationEditorNode {
  const value = item.draft?.editorJson;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as CollaborationEditorNode;
  }
  return defaultDocument(item.draft?.plainText ?? "");
}

async function runRpc<T>(
  operation: () => PromiseLike<{ data: T | null; error: unknown }>,
) {
  const { data, error } = await operation();
  if (error || data === null) throw new CollaborationAccessError();
  return data;
}

export async function getCollaborationWorkspace(
  item: ContentDetailDto,
): Promise<CollaborationWorkspaceDto> {
  const { client, authorization } = await getClient();
  const [
    capabilitiesResult,
    threadsResult,
    commentsResult,
    mentionsResult,
    suggestionsResult,
    profilesResult,
    templatesResult,
    latestVersionResult,
  ] = await Promise.all([
    client.rpc("get_collaboration_capabilities", {
      p_content_item_id: item.id,
    }),
    client
      .from("collaboration_threads")
      .select("id,anchor,created_by_user_id,resolved_at,created_at")
      .eq("content_item_id", item.id)
      .order("created_at"),
    client
      .from("collaboration_comments")
      .select("id,thread_id,author_user_id,body,created_at,deleted_at")
      .order("created_at"),
    client
      .from("collaboration_mentions")
      .select("comment_id,mentioned_user_id"),
    client
      .from("collaboration_suggestions")
      .select(
        "id,author_user_id,kind,anchor,source_text,replacement_text,state,record_version,applied_at,created_at",
      )
      .eq("content_item_id", item.id)
      .order("created_at", { ascending: false }),
    client
      .from("profiles")
      .select("user_id,display_name")
      .order("display_name"),
    client.rpc("list_collaboration_workflow_templates", {
      p_content_item_id: item.id,
    }),
    client
      .from("caption_versions")
      .select(
        "id,version_number,word_count,grapheme_count,word_policy_configured",
      )
      .eq("content_item_id", item.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (
    capabilitiesResult.error ||
    threadsResult.error ||
    commentsResult.error ||
    mentionsResult.error ||
    suggestionsResult.error ||
    profilesResult.error ||
    templatesResult.error ||
    latestVersionResult.error
  ) {
    throw new CollaborationAccessError();
  }

  const capabilities = capabilitiesResult.data?.[0];
  if (!capabilities) throw new CollaborationAccessError();

  const names = new Map(
    (profilesResult.data ?? []).map((profile) => [
      profile.user_id,
      profile.display_name,
    ]),
  );
  const mentionsByComment = new Map<string, string[]>();
  for (const mention of mentionsResult.data ?? []) {
    const values = mentionsByComment.get(mention.comment_id) ?? [];
    values.push(mention.mentioned_user_id);
    mentionsByComment.set(mention.comment_id, values);
  }
  const commentsByThread = new Map<string, CollaborationCommentDto[]>();
  for (const comment of commentsResult.data ?? []) {
    if (comment.deleted_at) continue;
    const values = commentsByThread.get(comment.thread_id) ?? [];
    values.push({
      id: comment.id,
      body: comment.body,
      authorUserId: comment.author_user_id,
      authorName: names.get(comment.author_user_id) ?? "CapItUp member",
      mentionedUserIds: mentionsByComment.get(comment.id) ?? [],
      createdAt: comment.created_at,
    });
    commentsByThread.set(comment.thread_id, values);
  }

  let latestReview: CollaborationWorkspaceDto["latestReview"] = null;
  if (latestVersionResult.data) {
    const latestVersion = latestVersionResult.data;
    const [
      workflowResult,
      reactionsResult,
      wordEvidenceResult,
      destinationEvidenceResult,
    ] = await Promise.all([
      client
        .from("workflow_instances")
        .select("id,status,current_step_id")
        .eq("caption_version_id", latestVersion.id)
        .maybeSingle(),
      client
        .from("caption_reactions")
        .select("id,actor_user_id,kind,comment")
        .eq("caption_version_id", latestVersion.id)
        .order("updated_at", { ascending: false }),
      client
        .from("caption_version_word_policy_evidence")
        .select(
          "policy_id,policy_version,warning_state,recommended_word_limit,global_hard_maximum_words,recommendation_exempt,exemption_reason",
        )
        .eq("caption_version_id", latestVersion.id),
      client
        .from("caption_version_destination_policy_evidence")
        .select(
          "publication_channel_id,policy_id,policy_version,destination_label,evaluated_grapheme_count,character_limit,warning_state",
        )
        .eq("caption_version_id", latestVersion.id),
    ]);
    if (
      workflowResult.error ||
      reactionsResult.error ||
      wordEvidenceResult.error ||
      destinationEvidenceResult.error
    ) {
      throw new CollaborationAccessError();
    }

    let currentStep: string | null = null;
    if (workflowResult.data?.current_step_id) {
      const { data: step, error: stepError } = await client
        .from("workflow_instance_steps")
        .select("kind,status")
        .eq("id", workflowResult.data.current_step_id)
        .maybeSingle();
      if (stepError) throw new CollaborationAccessError();
      currentStep = step
        ? `${step.kind.replaceAll("_", " ")} · ${step.status.replaceAll("_", " ")}`
        : null;
    }

    latestReview = {
      captionVersionId: latestVersion.id,
      versionNumber: latestVersion.version_number,
      status: workflowResult.data?.status ?? "submitted",
      currentStep,
      reactions: (reactionsResult.data ?? []).map((reaction) => ({
        id: reaction.id,
        actorUserId: reaction.actor_user_id,
        actorName: names.get(reaction.actor_user_id) ?? "CapItUp member",
        kind: reaction.kind,
        comment: reaction.comment,
      })),
      evidence: {
        wordCount: latestVersion.word_count,
        graphemeCount: latestVersion.grapheme_count,
        wordPolicyConfigured: latestVersion.word_policy_configured,
        wordPolicies: (wordEvidenceResult.data ?? []).map((evidence) => ({
          policyId: evidence.policy_id,
          policyVersion: evidence.policy_version,
          warningState: evidence.warning_state,
          recommendedWordLimit: evidence.recommended_word_limit,
          globalHardMaximumWords: evidence.global_hard_maximum_words,
          recommendationExempt: evidence.recommendation_exempt,
          exemptionReason: evidence.exemption_reason,
        })),
        destinations: (destinationEvidenceResult.data ?? []).map(
          (evidence) => ({
            publicationChannelId: evidence.publication_channel_id,
            policyId: evidence.policy_id,
            policyVersion: evidence.policy_version,
            label: evidence.destination_label,
            graphemeCount: evidence.evaluated_grapheme_count,
            characterLimit: evidence.character_limit,
            warningState: evidence.warning_state,
          }),
        ),
      },
    };
  }

  return {
    currentUserId: authorization.userId,
    roomId: collaborationRoomId(item.organizationId, item.id),
    accessMode: capabilities.access_mode,
    canComment: capabilities.can_comment,
    canSuggest: capabilities.can_suggest,
    canReview: capabilities.can_review,
    canReact: capabilities.can_suggest,
    initialContent: initialDocument(item),
    threads: (threadsResult.data ?? []).map((thread) => ({
      id: thread.id,
      anchor: thread.anchor,
      createdByUserId: thread.created_by_user_id,
      resolvedAt: thread.resolved_at,
      comments: commentsByThread.get(thread.id) ?? [],
    })),
    suggestions: (suggestionsResult.data ?? []).map((suggestion) => ({
      id: suggestion.id,
      authorUserId: suggestion.author_user_id,
      authorName: names.get(suggestion.author_user_id) ?? "CapItUp member",
      kind: suggestion.kind,
      anchor: suggestion.anchor,
      sourceText: suggestion.source_text,
      replacementText: suggestion.replacement_text,
      state: suggestion.state,
      recordVersion: suggestion.record_version,
      appliedAt: suggestion.applied_at,
      createdAt: suggestion.created_at,
    })),
    mentionOptions: (profilesResult.data ?? []).map((profile) => ({
      userId: profile.user_id,
      label: profile.display_name,
    })),
    workflowTemplates: templatesResult.data ?? [],
    latestReview,
  };
}

export async function createCollaborationThread(input: {
  contentItemId: string;
  anchor: Json;
  body: string;
  mentionedUserIds: string[];
}) {
  const { client } = await getClient();
  return runRpc(() =>
    client.rpc("create_collaboration_thread", {
      p_content_item_id: input.contentItemId,
      p_anchor: input.anchor,
      p_body: input.body,
      p_mentioned_user_ids: input.mentionedUserIds,
    }),
  );
}

export async function replyToCollaborationThread(input: {
  threadId: string;
  body: string;
  mentionedUserIds: string[];
}) {
  const { client } = await getClient();
  return runRpc(() =>
    client.rpc("reply_to_collaboration_thread", {
      p_thread_id: input.threadId,
      p_body: input.body,
      p_mentioned_user_ids: input.mentionedUserIds,
    }),
  );
}

export async function resolveCollaborationThread(input: {
  threadId: string;
  resolved: boolean;
}) {
  const { client } = await getClient();
  return runRpc(() =>
    client.rpc("resolve_collaboration_thread", {
      p_thread_id: input.threadId,
      p_resolved: input.resolved,
    }),
  );
}

export async function createCollaborationSuggestion(input: {
  contentItemId: string;
  kind: CollaborationSuggestionKind;
  anchor: Json;
  sourceText: string;
  replacementText: string;
}) {
  const { client } = await getClient();
  return runRpc(() =>
    client.rpc("create_collaboration_suggestion", {
      p_content_item_id: input.contentItemId,
      p_kind: input.kind,
      p_anchor: input.anchor,
      p_source_text: input.sourceText,
      p_replacement_text: input.replacementText,
    }),
  );
}

export async function decideCollaborationSuggestion(input: {
  suggestionId: string;
  expectedVersion: number;
  action: "accept" | "reject";
  reason: string | null;
}) {
  const { client } = await getClient();
  return runRpc(() =>
    client.rpc("decide_collaboration_suggestion", {
      p_suggestion_id: input.suggestionId,
      p_expected_version: input.expectedVersion,
      p_action: input.action,
      p_reason: input.reason,
    }),
  );
}

export async function markCollaborationSuggestionApplied(input: {
  suggestionId: string;
  expectedVersion: number;
}) {
  const { client } = await getClient();
  return runRpc(() =>
    client.rpc("mark_collaboration_suggestion_applied", {
      p_suggestion_id: input.suggestionId,
      p_expected_version: input.expectedVersion,
    }),
  );
}

export async function setCaptionReaction(input: {
  captionVersionId: string;
  kind: CaptionReactionKind | null;
  comment: string | null;
}) {
  const { client } = await getClient();
  const { data, error } = await client.rpc("set_caption_reaction", {
    p_caption_version_id: input.captionVersionId,
    p_kind: input.kind,
    p_comment: input.comment,
  });
  if (error) throw new CollaborationAccessError();
  return data;
}

export async function markWorkflowNotificationRead(notificationId: string) {
  const { client } = await getClient();
  return runRpc(() =>
    client.rpc("mark_notification_read", {
      p_notification_id: notificationId,
    }),
  );
}
