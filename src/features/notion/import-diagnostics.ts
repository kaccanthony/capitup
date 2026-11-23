export type ApplyImportFailureReason =
  | "service_role_client_missing"
  | "apply_rpc_error"
  | "apply_rpc_empty_result"
  | "notion_post_status_invalid"
  | "notion_assignee_refs_invalid"
  | "notion_webhook_event_missing"
  | "notion_import_invalid"
  | "notion_import_unavailable"
  | "notion_posting_link_missing"
  | "notion_owned_project_fields";

const controlledImportExceptions = new Set<ApplyImportFailureReason>([
  "notion_post_status_invalid",
  "notion_assignee_refs_invalid",
  "notion_webhook_event_missing",
  "notion_import_invalid",
  "notion_import_unavailable",
  "notion_posting_link_missing",
  "notion_owned_project_fields",
]);

export function classifyApplyImportFailure(input: {
  clientAvailable: boolean;
  rpcFailed: boolean;
  hasResultRow: boolean;
  databaseMessage?: string | null;
}): ApplyImportFailureReason | null {
  if (!input.clientAvailable) return "service_role_client_missing";
  if (input.rpcFailed) {
    const message = input.databaseMessage;
    return message &&
      controlledImportExceptions.has(message as ApplyImportFailureReason)
      ? (message as ApplyImportFailureReason)
      : "apply_rpc_error";
  }
  if (!input.hasResultRow) return "apply_rpc_empty_result";
  return null;
}
