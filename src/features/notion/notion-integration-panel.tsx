import type { NotionIntegrationOverview } from "@/features/notion/data";
import {
  configureNotionIntegrationAction,
  replayNotionDeadLetterAction,
  resolveNotionSyncConflictAction,
  resumeNotionSyncRunAction,
  verifyAndActivateNotionIntegrationAction,
} from "@/features/notion/actions";
import {
  fieldClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/features/projects/styles";
import { SensitiveIdInput } from "@/features/notion/sensitive-id-input";
import type { NotionFieldMapping } from "@/features/notion/contracts";

function mappingValue(
  overview: NotionIntegrationOverview,
  field: NotionFieldMapping["field"],
) {
  return (
    overview.connection?.mappings.find((mapping) => mapping.field === field)
      ?.propertyId ?? ""
  );
}

export function NotionIntegrationPanel({
  organizationId,
  overview,
  serverConfigured,
}: {
  organizationId: string;
  overview: NotionIntegrationOverview;
  serverConfigured: boolean;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,0.7fr)]">
      <div className="space-y-6">
        <section
          className="surface-panel"
          aria-labelledby="notion-connection-title"
        >
          <p className="eyebrow">Organization-managed connection</p>
          <h2
            id="notion-connection-title"
            className="mt-2 text-xl font-semibold"
          >
            Notion calendar integration
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            The token stays in server deployment configuration. Configure only
            the explicitly shared development data source and the three
            Notion-owned project fields.
          </p>

          <dl className="mt-5 grid gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--text-muted)]">Server secret</dt>
              <dd className="mt-1 font-medium">
                {serverConfigured ? "Configured" : "Not configured"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Connection status</dt>
              <dd className="mt-1 font-medium">
                {overview.connection?.status ?? "Not configured"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Last successful sync</dt>
              <dd className="mt-1 font-medium">
                {overview.connection?.lastSuccessAt ?? "None yet"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Open conflicts</dt>
              <dd className="mt-1 font-medium">
                {overview.openConflicts.length}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Last failure</dt>
              <dd className="mt-1 font-medium">
                {overview.connection?.lastFailureAt
                  ? (overview.connection.lastErrorCode ?? "Recorded")
                  : "None"}
              </dd>
            </div>
          </dl>
        </section>

        <section
          className="surface-panel"
          aria-labelledby="notion-mapping-title"
        >
          <p className="eyebrow">Mapped import fields</p>
          <h2 id="notion-mapping-title" className="mt-2 text-xl font-semibold">
            Safe setup
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Exports, working captions, versions, and final captions remain
            disabled until their field ownership decisions are accepted.
          </p>
          <form
            action={configureNotionIntegrationAction}
            className="mt-6 grid gap-4"
          >
            <input name="organizationId" type="hidden" value={organizationId} />
            <label className="text-sm font-medium">
              Connection label
              <input
                className={fieldClassName}
                defaultValue={
                  overview.connection?.label ?? "Notion development calendar"
                }
                name="label"
                required
              />
            </label>
            <label className="text-sm font-medium">
              Notion workspace ID
              <SensitiveIdInput
                className={fieldClassName}
                defaultValue={overview.connection?.workspaceId ?? ""}
                label="Notion workspace ID"
                name="workspaceId"
                required
              />
            </label>
            <label className="text-sm font-medium">
              Webhook subscription ID
              <SensitiveIdInput
                className={fieldClassName}
                defaultValue={overview.connection?.subscriptionId ?? ""}
                label="Webhook subscription ID"
                name="subscriptionId"
                required
              />
            </label>
            <label className="text-sm font-medium">
              Shared data source ID
              <SensitiveIdInput
                className={fieldClassName}
                defaultValue={overview.connection?.dataSourceId ?? ""}
                label="Shared data source ID"
                name="dataSourceId"
                required
              />
            </label>
            <label className="text-sm font-medium">
              Project title property ID (title)
              <SensitiveIdInput
                className={fieldClassName}
                defaultValue={mappingValue(overview, "project_title")}
                label="Project title property ID"
                name="titlePropertyId"
                required
              />
            </label>
            <label className="text-sm font-medium">
              Event date property ID (date)
              <SensitiveIdInput
                className={fieldClassName}
                defaultValue={mappingValue(overview, "event_start_at")}
                label="Event date property ID"
                name="eventStartPropertyId"
                required
              />
            </label>
            <label className="text-sm font-medium">
              Deadline property ID (date)
              <SensitiveIdInput
                className={fieldClassName}
                defaultValue={mappingValue(overview, "deadline_at")}
                label="Deadline property ID"
                name="deadlinePropertyId"
                required
              />
            </label>
            <label className="text-sm font-medium">
              CapItUp Viewer URL property ID (url)
              <SensitiveIdInput
                className={fieldClassName}
                defaultValue={mappingValue(overview, "viewer_url")}
                label="CapItUp Viewer URL property ID"
                name="viewerUrlPropertyId"
              />
            </label>
            <label className="text-sm font-medium">
              CapItUp Caption property ID (rich_text)
              <SensitiveIdInput
                className={fieldClassName}
                defaultValue={mappingValue(overview, "caption_content")}
                label="CapItUp Caption property ID"
                name="captionContentPropertyId"
              />
            </label>
            <button className={primaryButtonClassName} type="submit">
              Save safe mapping
            </button>
          </form>
        </section>
      </div>

      <aside className="space-y-6">
        {overview.connection && (
          <section
            className="surface-panel"
            aria-labelledby="notion-verify-title"
          >
            <p className="eyebrow">Explicitly shared scope</p>
            <h2 id="notion-verify-title" className="mt-2 text-xl font-semibold">
              Verify access
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              This verifies that the server-only integration can read the
              configured development data source before webhook processing is
              enabled.
            </p>
            <form
              action={verifyAndActivateNotionIntegrationAction}
              className="mt-5"
            >
              <input
                name="connectionId"
                type="hidden"
                value={overview.connection.id}
              />
              <button
                className={secondaryButtonClassName}
                disabled={!serverConfigured}
                type="submit"
              >
                Verify and activate
              </button>
            </form>
          </section>
        )}

        <section className="surface-panel" aria-labelledby="notion-runs-title">
          <p className="eyebrow">Sync health</p>
          <h2 id="notion-runs-title" className="mt-2 text-xl font-semibold">
            Recent activity
          </h2>
          {overview.recentRuns.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              No sync runs have been recorded.
            </p>
          ) : (
            <ol className="mt-4 space-y-3 text-sm">
              {overview.recentRuns.map((run) => (
                <li
                  className="rounded-lg border border-white/8 p-3"
                  key={run.id}
                >
                  <p className="font-medium">
                    {run.direction} · {run.state}
                  </p>
                  <p className="mt-1 text-[var(--text-muted)]">
                    {run.errorCode ?? run.createdAt}
                  </p>
                  {run.state === "retry_scheduled" && (
                    <form action={resumeNotionSyncRunAction} className="mt-3">
                      <input name="syncRunId" type="hidden" value={run.id} />
                      <button
                        className={secondaryButtonClassName}
                        type="submit"
                      >
                        Retry now
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>

        {overview.openConflicts.length > 0 && (
          <section
            className="surface-panel"
            aria-labelledby="notion-conflicts-title"
          >
            <p className="eyebrow">Action required</p>
            <h2
              id="notion-conflicts-title"
              className="mt-2 text-xl font-semibold"
            >
              Sync conflicts
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Review the source page and mapping before acknowledging a
              conflict. No caption or working version is sent to Notion.
            </p>
            <ul className="mt-4 space-y-3">
              {overview.openConflicts.map((conflict) => (
                <li
                  className="rounded-lg border border-amber-200/20 p-3"
                  key={conflict.id}
                >
                  <p className="text-sm font-medium">{conflict.kind}</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {conflict.detailCode}
                  </p>
                  <form
                    action={resolveNotionSyncConflictAction}
                    className="mt-3"
                  >
                    <input
                      name="conflictId"
                      type="hidden"
                      value={conflict.id}
                    />
                    <button className={secondaryButtonClassName} type="submit">
                      Acknowledge resolution
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        )}

        {overview.deadLetters.length > 0 && (
          <section
            className="surface-panel"
            aria-labelledby="notion-dead-letter-title"
          >
            <p className="eyebrow">Manual recovery</p>
            <h2
              id="notion-dead-letter-title"
              className="mt-2 text-xl font-semibold"
            >
              Dead letters
            </h2>
            <ul className="mt-4 space-y-3">
              {overview.deadLetters.map((event) => (
                <li
                  className="rounded-lg border border-amber-200/20 p-3"
                  key={event.id}
                >
                  <p className="text-sm">{event.reasonCode}</p>
                  <form action={replayNotionDeadLetterAction} className="mt-3">
                    <input name="deadLetterId" type="hidden" value={event.id} />
                    <button className={secondaryButtonClassName} type="submit">
                      Queue replay ({event.replayCount})
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
