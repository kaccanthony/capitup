"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  pushCaptionToNotion,
  pullCaptionFromNotion,
  getSyncStatus,
  NotionManualSyncError,
} from "@/features/notion/manual-sync";
import { getAuthorizationForClient } from "@/lib/auth/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const contentPath = (projectId: string, contentItemId: string) =>
  `/projects/${projectId}/content/${contentItemId}`;

async function requireAuth() {
  const client = await createServerSupabaseClient();
  if (!client) {
    redirect("/login");
  }
  return getAuthorizationForClient(client);
}

export async function getNotionSyncStatus(
  organizationId: string,
  projectId: string,
  contentItemId: string,
) {
  return getSyncStatus({ organizationId, projectId, contentItemId });
}

export async function refreshNotionSyncStatusAction(formData: FormData) {
  const projectId = formData.get("projectId") as string;
  const contentItemId = formData.get("contentItemId") as string;

  if (!projectId || !contentItemId) {
    return;
  }

  const decision = await requireAuth();
  if (decision.kind !== "active") {
    redirect("/access-denied");
  }

  revalidatePath(contentPath(projectId, contentItemId));
}

export async function pushCaptionToNotionAction(formData: FormData) {
  const projectId = formData.get("projectId") as string;
  const contentItemId = formData.get("contentItemId") as string;

  if (!projectId || !contentItemId) {
    redirect(`${contentPath(projectId, contentItemId)}?notice=invalid`);
  }

  const decision = await requireAuth();
  if (decision.kind !== "active") {
    redirect("/access-denied");
  }

  try {
    await pushCaptionToNotion({
      organizationId: decision.organizationId,
      projectId,
      contentItemId,
    });
  } catch (error) {
    if (error instanceof NotionManualSyncError && error.code === "diverged") {
      redirect(`${contentPath(projectId, contentItemId)}?notice=notion-diverged`);
    }
    redirect(`${contentPath(projectId, contentItemId)}?notice=push-failed`);
  }

  revalidatePath(contentPath(projectId, contentItemId));
  redirect(`${contentPath(projectId, contentItemId)}?notice=pushed`);
}

export async function pullCaptionFromNotionAction(formData: FormData) {
  const projectId = formData.get("projectId") as string;
  const contentItemId = formData.get("contentItemId") as string;

  if (!projectId || !contentItemId) {
    redirect(`${contentPath(projectId, contentItemId)}?notice=invalid`);
  }

  const decision = await requireAuth();
  if (decision.kind !== "active") {
    redirect("/access-denied");
  }

  try {
    const result = await pullCaptionFromNotion({
      organizationId: decision.organizationId,
      projectId,
      contentItemId,
    });

    if (result.conflict) {
      redirect(`${contentPath(projectId, contentItemId)}?notice=conflict`);
    }
  } catch (error) {
    if (error instanceof NotionManualSyncError && error.code === "conflict") {
      redirect(`${contentPath(projectId, contentItemId)}?notice=conflict`);
    }
    redirect(`${contentPath(projectId, contentItemId)}?notice=pull-failed`);
  }

  revalidatePath(contentPath(projectId, contentItemId));
  redirect(`${contentPath(projectId, contentItemId)}?notice=pulled`);
}

export async function getNotionSyncStatusAction(formData: FormData) {
  const projectId = formData.get("projectId") as string;
  const contentItemId = formData.get("contentItemId") as string;

  if (!projectId || !contentItemId) {
    return { error: "Invalid parameters" };
  }

  const decision = await requireAuth();
  if (decision.kind !== "active") {
    return { error: "Unauthorized" };
  }

  try {
    const status = await getSyncStatus({
      organizationId: decision.organizationId,
      projectId,
      contentItemId,
    });
    return status;
  } catch {
    return { error: "Failed to get sync status" };
  }
}