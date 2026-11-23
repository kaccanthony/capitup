import { describe, expect, it } from "vitest";
import { classifyApplyImportFailure } from "@/features/notion/import-diagnostics";

describe("Notion apply-import diagnostics", () => {
  it("distinguishes an unavailable service-role client", () => {
    expect(
      classifyApplyImportFailure({
        clientAvailable: false,
        rpcFailed: false,
        hasResultRow: false,
      }),
    ).toBe("service_role_client_missing");
  });

  it("distinguishes an RPC error from an empty result", () => {
    expect(
      classifyApplyImportFailure({
        clientAvailable: true,
        rpcFailed: true,
        hasResultRow: false,
      }),
    ).toBe("apply_rpc_error");
    expect(
      classifyApplyImportFailure({
        clientAvailable: true,
        rpcFailed: false,
        hasResultRow: false,
      }),
    ).toBe("apply_rpc_empty_result");
  });

  it("maps only exact, allowlisted SQL import exceptions", () => {
    for (const databaseMessage of [
      "notion_import_unavailable",
      "notion_posting_link_missing",
      "notion_post_status_invalid",
      "notion_assignee_refs_invalid",
      "notion_webhook_event_missing",
      "notion_import_invalid",
      "notion_owned_project_fields",
    ]) {
      expect(
        classifyApplyImportFailure({
          clientAvailable: true,
          rpcFailed: true,
          hasResultRow: false,
          databaseMessage,
        }),
      ).toBe(databaseMessage);
    }
    expect(
      classifyApplyImportFailure({
        clientAvailable: true,
        rpcFailed: true,
        hasResultRow: false,
        databaseMessage: "notion_import_unavailable with private detail",
      }),
    ).toBe("apply_rpc_error");
  });

  it("does not report failure for a returned table row", () => {
    expect(
      classifyApplyImportFailure({
        clientAvailable: true,
        rpcFailed: false,
        hasResultRow: true,
      }),
    ).toBeNull();
  });
});
