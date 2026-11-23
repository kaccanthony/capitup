"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  NotionLinkSyncError,
  syncCapItUpLink,
} from "@/features/notion/link-sync";

const idSchema = z.string().uuid();

export async function syncCapItUpLinkAction(formData: FormData) {
  const projectId = idSchema.safeParse(formData.get("projectId"));
  const contentItemId = idSchema.safeParse(formData.get("contentItemId"));
  if (!projectId.success || !contentItemId.success) redirect("/access-denied");

  const path = `/projects/${projectId.data}/content/${contentItemId.data}`;
  try {
    await syncCapItUpLink({
      projectId: projectId.data,
      contentItemId: contentItemId.data,
    });
  } catch (error) {
    const notice =
      error instanceof NotionLinkSyncError && error.code === "forbidden"
        ? "notion-link-forbidden"
        : "notion-link-sync-failed";
    redirect(`${path}?notice=${notice}`);
  }

  revalidatePath(path);
  redirect(`${path}?notice=notion-link-synced`);
}
