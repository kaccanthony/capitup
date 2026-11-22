"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  applySuggestionSchema,
  collaborationAnchorSchema,
  collaborationMentionIdsSchema,
  createSuggestionSchema,
  createThreadSchema,
  decideSuggestionSchema,
  markNotificationReadSchema,
  replyThreadSchema,
  resolveThreadSchema,
  setCaptionReactionSchema,
} from "@/features/collaboration/contracts";
import {
  createCollaborationSuggestion,
  createCollaborationThread,
  decideCollaborationSuggestion,
  markCollaborationSuggestionApplied,
  markWorkflowNotificationRead,
  replyToCollaborationThread,
  resolveCollaborationThread,
  setCaptionReaction,
} from "@/features/collaboration/data";

function parseJson(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function contentPath(projectId: string, contentItemId: string) {
  return `/projects/${projectId}/content/${contentItemId}`;
}

export async function createCollaborationThreadAction(formData: FormData) {
  const parsed = createThreadSchema.safeParse({
    projectId: formData.get("projectId"),
    contentItemId: formData.get("contentItemId"),
    anchor: collaborationAnchorSchema.safeParse(
      parseJson(formData.get("anchor")),
    ).data,
    body: formData.get("body"),
    mentionedUserIds: collaborationMentionIdsSchema.safeParse(
      parseJson(formData.get("mentionedUserIds")),
    ).data,
  });
  if (!parsed.success) redirect("/access-denied");

  try {
    await createCollaborationThread(parsed.data);
  } catch {
    redirect("/access-denied");
  }
  revalidatePath(contentPath(parsed.data.projectId, parsed.data.contentItemId));
}

export async function replyCollaborationThreadAction(formData: FormData) {
  const parsed = replyThreadSchema.safeParse({
    projectId: formData.get("projectId"),
    contentItemId: formData.get("contentItemId"),
    threadId: formData.get("threadId"),
    body: formData.get("body"),
    mentionedUserIds: collaborationMentionIdsSchema.safeParse(
      parseJson(formData.get("mentionedUserIds")),
    ).data,
  });
  if (!parsed.success) redirect("/access-denied");

  try {
    await replyToCollaborationThread(parsed.data);
  } catch {
    redirect("/access-denied");
  }
  revalidatePath(contentPath(parsed.data.projectId, parsed.data.contentItemId));
}

export async function resolveCollaborationThreadAction(formData: FormData) {
  const parsed = resolveThreadSchema.safeParse({
    projectId: formData.get("projectId"),
    contentItemId: formData.get("contentItemId"),
    threadId: formData.get("threadId"),
    resolved: formData.get("resolved") === "true",
  });
  if (!parsed.success) redirect("/access-denied");

  try {
    await resolveCollaborationThread(parsed.data);
  } catch {
    redirect("/access-denied");
  }
  revalidatePath(contentPath(parsed.data.projectId, parsed.data.contentItemId));
}

export async function createCollaborationSuggestionAction(formData: FormData) {
  const parsed = createSuggestionSchema.safeParse({
    projectId: formData.get("projectId"),
    contentItemId: formData.get("contentItemId"),
    kind: formData.get("kind"),
    anchor: collaborationAnchorSchema.safeParse(
      parseJson(formData.get("anchor")),
    ).data,
    sourceText: formData.get("sourceText"),
    replacementText: formData.get("replacementText"),
  });
  if (!parsed.success) redirect("/access-denied");

  try {
    await createCollaborationSuggestion(parsed.data);
  } catch {
    redirect("/access-denied");
  }
  revalidatePath(contentPath(parsed.data.projectId, parsed.data.contentItemId));
}

export async function decideCollaborationSuggestionAction(formData: FormData) {
  const parsed = decideSuggestionSchema.safeParse({
    projectId: formData.get("projectId"),
    contentItemId: formData.get("contentItemId"),
    suggestionId: formData.get("suggestionId"),
    expectedVersion: Number(formData.get("expectedVersion")),
    action: formData.get("action"),
    reason:
      typeof formData.get("reason") === "string"
        ? String(formData.get("reason")) || null
        : null,
  });
  if (!parsed.success) redirect("/access-denied");

  try {
    await decideCollaborationSuggestion(parsed.data);
  } catch {
    redirect("/access-denied");
  }
  revalidatePath(contentPath(parsed.data.projectId, parsed.data.contentItemId));
}

export async function markCollaborationSuggestionAppliedAction(
  formData: FormData,
) {
  const parsed = applySuggestionSchema.safeParse({
    projectId: formData.get("projectId"),
    contentItemId: formData.get("contentItemId"),
    suggestionId: formData.get("suggestionId"),
    expectedVersion: Number(formData.get("expectedVersion")),
  });
  if (!parsed.success) redirect("/access-denied");

  try {
    await markCollaborationSuggestionApplied(parsed.data);
  } catch {
    redirect("/access-denied");
  }
  revalidatePath(contentPath(parsed.data.projectId, parsed.data.contentItemId));
}

export async function setCaptionReactionAction(formData: FormData) {
  const rawKind = formData.get("kind");
  const parsed = setCaptionReactionSchema.safeParse({
    projectId: formData.get("projectId"),
    contentItemId: formData.get("contentItemId"),
    captionVersionId: formData.get("captionVersionId"),
    kind: rawKind === "" ? null : rawKind,
    comment:
      typeof formData.get("comment") === "string"
        ? String(formData.get("comment")) || null
        : null,
  });
  if (!parsed.success) redirect("/access-denied");

  try {
    await setCaptionReaction(parsed.data);
  } catch {
    redirect("/access-denied");
  }
  revalidatePath(contentPath(parsed.data.projectId, parsed.data.contentItemId));
}

export async function markWorkflowNotificationReadAction(formData: FormData) {
  const parsed = markNotificationReadSchema.safeParse({
    projectId: formData.get("projectId"),
    contentItemId: formData.get("contentItemId"),
    notificationId: formData.get("notificationId"),
  });
  if (!parsed.success) redirect("/access-denied");

  try {
    await markWorkflowNotificationRead(parsed.data.notificationId);
  } catch {
    redirect("/access-denied");
  }
  revalidatePath(contentPath(parsed.data.projectId, parsed.data.contentItemId));
}
