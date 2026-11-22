"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  activateNotionIntegration,
  configureNotionIntegration,
  markNotionIntegrationActive,
  replayNotionDeadLetter,
  resolveNotionSyncConflict,
  resumeNotionSyncRun,
} from "@/features/notion/data";
import { verifyNotionDataSourceAccess } from "@/features/notion/notion-client";
import { synchronizeNotionWebhookImport } from "@/features/notion/sync";

const settingsPath = "/settings/integrations/notion";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry : "";
}

export async function configureNotionIntegrationAction(formData: FormData) {
  const organizationId = value(formData, "organizationId");
  try {
    await configureNotionIntegration({
      organizationId,
      label: value(formData, "label"),
      workspaceId: value(formData, "workspaceId"),
      subscriptionId: value(formData, "subscriptionId"),
      dataSourceId: value(formData, "dataSourceId"),
      mappings: [
        {
          field: "project_title",
          direction: "import",
          propertyId: value(formData, "titlePropertyId"),
          propertyType: "title",
        },
        {
          field: "event_start_at",
          direction: "import",
          propertyId: value(formData, "eventStartPropertyId"),
          propertyType: "date",
        },
        {
          field: "deadline_at",
          direction: "import",
          propertyId: value(formData, "deadlinePropertyId"),
          propertyType: "date",
        },
      ],
    });
  } catch {
    redirect(`${settingsPath}?notice=configuration-invalid`);
  }

  revalidatePath(settingsPath);
  redirect(`${settingsPath}?notice=configured`);
}

export async function verifyAndActivateNotionIntegrationAction(
  formData: FormData,
) {
  const connectionId = value(formData, "connectionId");
  try {
    const { dataSourceId } = await activateNotionIntegration(connectionId);
    await verifyNotionDataSourceAccess({ dataSourceId });
    await markNotionIntegrationActive(connectionId);
  } catch {
    redirect(`${settingsPath}?notice=connection-unavailable`);
  }

  revalidatePath(settingsPath);
  redirect(`${settingsPath}?notice=active`);
}

export async function replayNotionDeadLetterAction(formData: FormData) {
  try {
    const webhookEventId = await replayNotionDeadLetter(
      value(formData, "deadLetterId"),
    );
    await synchronizeNotionWebhookImport(webhookEventId);
  } catch {
    redirect(`${settingsPath}?notice=replay-unavailable`);
  }

  revalidatePath(settingsPath);
  redirect(`${settingsPath}?notice=replay-queued`);
}

export async function resumeNotionSyncRunAction(formData: FormData) {
  try {
    const webhookEventId = await resumeNotionSyncRun(
      value(formData, "syncRunId"),
    );
    await synchronizeNotionWebhookImport(webhookEventId);
  } catch {
    redirect(`${settingsPath}?notice=retry-unavailable`);
  }

  revalidatePath(settingsPath);
  redirect(`${settingsPath}?notice=retry-completed`);
}

export async function resolveNotionSyncConflictAction(formData: FormData) {
  try {
    await resolveNotionSyncConflict(value(formData, "conflictId"));
  } catch {
    redirect(`${settingsPath}?notice=conflict-unavailable`);
  }

  revalidatePath(settingsPath);
  redirect(`${settingsPath}?notice=conflict-resolved`);
}
