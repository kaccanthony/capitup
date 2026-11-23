import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { redirect } from "next/navigation";
import {
  addDeliverableAction,
  assignContentResponsibilityAction,
  updateContentItemAction,
} from "@/features/projects/actions";
import { CollaborationWorkspace } from "@/features/collaboration/collaboration-workspace";
import { getCollaborationWorkspace } from "@/features/collaboration/data";
import { ContentForm } from "@/features/projects/content-form";
import {
  getAccessibleContentItem,
  getAccessibleProject,
  getControlledTaxonomy,
} from "@/features/projects/data";
import { AiAssistancePanel } from "@/features/ai/ai-assistance-panel";
import { listVisibleAiStyleProfiles } from "@/features/ai/data";
import {
  fieldClassName,
  primaryButtonClassName,
  ProjectWorkspace,
  secondaryButtonClassName,
} from "@/features/projects/project-workspace";
import { syncCapItUpLinkAction } from "@/features/notion/link-sync-actions";

export const metadata: Metadata = { title: "Content record" };

export default async function ContentRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; contentId: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { projectId, contentId } = await params;
  const { notice } = await searchParams;
  let item: Awaited<ReturnType<typeof getAccessibleContentItem>>;
  let project: Awaited<ReturnType<typeof getAccessibleProject>>;
  let taxonomy: Awaited<ReturnType<typeof getControlledTaxonomy>>;
  let collaboration: Awaited<
    ReturnType<typeof getCollaborationWorkspace>
  > | null = null;
  let aiStyleProfiles: Awaited<ReturnType<typeof listVisibleAiStyleProfiles>> =
    [];

  try {
    [item, project, taxonomy] = await Promise.all([
      getAccessibleContentItem(projectId, contentId),
      getAccessibleProject(projectId),
      getControlledTaxonomy(),
    ]);
  } catch {
    redirect("/access-denied");
  }

  if (!item || !project) redirect("/access-denied");

  try {
    [collaboration, aiStyleProfiles] = await Promise.all([
      getCollaborationWorkspace(item),
      listVisibleAiStyleProfiles(),
    ]);
  } catch {
    redirect("/access-denied");
  }

  return (
    <ProjectWorkspace
      eyebrow={`${item.kind} · ${item.status.replaceAll("_", " ")}`}
      title={item.title}
      description="Live collaborative drafting with durable Supabase comments, suggestions, mentions, resolutions, and immutable review snapshots."
      actions={
        <Link
          className={secondaryButtonClassName}
          href={`/projects/${project.id}`}
        >
          Back to project
        </Link>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <div className="space-y-5">
          {notice === "notion-link-sync-failed" && (
            <p role="status" className="surface-panel text-sm text-amber-100">
              Notion link sync failed. Your CapItUp edits and approvals are
              unchanged. Retry when Notion is available.
            </p>
          )}
          {notice === "notion-link-synced" && (
            <p role="status" className="surface-panel text-sm text-emerald-100">
              Cap-It-Up link synced to Notion.
            </p>
          )}
          {notice === "notion-link-forbidden" && (
            <p role="status" className="surface-panel text-sm text-amber-100">
              You need editing access to sync this link.
            </p>
          )}
          <section
            className="surface-panel"
            aria-labelledby="content-metadata-title"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Controlled record</p>
                <h2
                  id="content-metadata-title"
                  className="mt-2 text-xl font-semibold"
                >
                  Metadata
                </h2>
              </div>
              <span className="status-badge status-draft">
                {item.status.replaceAll("_", " ")}
              </span>
            </div>
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Content kind
                </dt>
                <dd className="mt-2 capitalize">{item.kind}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Record version
                </dt>
                <dd className="mt-2">{item.recordVersion}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Controlled tags
                </dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span className="status-badge status-review" key={tag}>
                      {tag}
                    </span>
                  ))}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Special case
                </dt>
                <dd className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {item.isSpecialCase
                    ? item.specialCaseReason
                    : "No. The indicator grants no exception by itself."}
                </dd>
              </div>
            </dl>
          </section>

          <CollaborationWorkspace
            projectId={project.id}
            contentItemId={item.id}
            workspace={collaboration}
          />

          <AiAssistancePanel
            canEdit={item.canEdit}
            profiles={aiStyleProfiles}
            styleProfileName={aiStyleProfiles[0]?.name ?? null}
          />

          {item.canEdit && (
            <section
              className="surface-panel"
              aria-labelledby="edit-content-title"
            >
              <h2 id="edit-content-title" className="text-xl font-semibold">
                Edit metadata
              </h2>
              <div className="mt-6">
                <ContentForm
                  action={updateContentItemAction}
                  projectId={project.id}
                  taxonomy={taxonomy}
                  initial={{
                    id: item.id,
                    title: item.title,
                    kind: item.kind,
                    tags: item.tags,
                    isSpecialCase: item.isSpecialCase,
                    specialCaseReason: item.specialCaseReason,
                    recordVersion: item.recordVersion,
                  }}
                  submitLabel="Save metadata"
                />
              </div>
            </section>
          )}
        </div>

        <div className="space-y-5">
          <section
            className="surface-panel"
            aria-labelledby="deliverables-title"
          >
            <h2 id="deliverables-title" className="text-lg font-semibold">
              Deliverable links
            </h2>
            {item.deliverables.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                No deliverable links have been added.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {item.deliverables.map((deliverable) => (
                  <li
                    className="rounded-xl border border-white/8 bg-white/[0.035] p-3"
                    key={deliverable.id}
                  >
                    <a
                      className="inline-flex items-center gap-2 font-medium text-[var(--lavender-soft)] hover:text-white"
                      href={deliverable.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {deliverable.label}
                      <ExternalLink aria-hidden="true" className="size-3.5" />
                    </a>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {deliverable.sourceCommittee} ·{" "}
                      {deliverable.deliverableType}
                      {deliverable.status ? ` · ${deliverable.status}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {item.canSyncNotionLink && (
              <form
                action={addDeliverableAction}
                className="mt-6 space-y-3 border-t border-white/8 pt-5"
              >
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="contentItemId" value={item.id} />
                <label className="block text-sm font-medium">
                  Label
                  <input
                    className={fieldClassName}
                    name="label"
                    required
                    maxLength={120}
                  />
                </label>
                <label className="block text-sm font-medium">
                  HTTP(S) URL
                  <input
                    className={fieldClassName}
                    name="url"
                    type="url"
                    required
                    maxLength={2048}
                  />
                </label>
                <label className="block text-sm font-medium">
                  Source committee
                  <input
                    className={fieldClassName}
                    name="sourceCommittee"
                    required
                    maxLength={120}
                  />
                </label>
                <label className="block text-sm font-medium">
                  Deliverable type
                  <input
                    className={fieldClassName}
                    name="deliverableType"
                    required
                    maxLength={80}
                  />
                </label>
                <label className="block text-sm font-medium">
                  Status{" "}
                  <span className="text-[var(--text-muted)]">(optional)</span>
                  <input
                    className={fieldClassName}
                    name="status"
                    maxLength={80}
                  />
                </label>
                <button className={primaryButtonClassName} type="submit">
                  Add deliverable
                </button>
              </form>
            )}
          </section>

          <section
            className="surface-panel"
            aria-labelledby="responsibilities-title"
          >
            <h2 id="responsibilities-title" className="text-lg font-semibold">
              Writers and reviewers
            </h2>
            <ul className="mt-4 space-y-2">
              {item.responsibilities.map((responsibility) => (
                <li
                  className="flex items-center justify-between rounded-xl border border-white/8 px-3 py-2 text-sm"
                  key={responsibility.id}
                >
                  <span className="capitalize">
                    {responsibility.responsibility}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    Assigned project member
                  </span>
                </li>
              ))}
            </ul>
            {project.canManage && project.assignments.length > 0 && (
              <form
                action={assignContentResponsibilityAction}
                className="mt-5 space-y-3 border-t border-white/8 pt-5"
              >
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="contentItemId" value={item.id} />
                <label className="block text-sm font-medium">
                  Project assignment
                  <select className={fieldClassName} name="projectAssignmentId">
                    {project.assignments
                      .filter((assignment) => assignment.role !== "viewer")
                      .map((assignment) => (
                        <option value={assignment.id} key={assignment.id}>
                          {assignment.role.replaceAll("_", " ")}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Responsibility
                  <select className={fieldClassName} name="responsibility">
                    <option value="writer">Writer</option>
                    <option value="reviewer">Reviewer</option>
                  </select>
                </label>
                <button className={primaryButtonClassName} type="submit">
                  Assign responsibility
                </button>
              </form>
            )}
          </section>

          <section
            className="surface-panel"
            aria-labelledby="destinations-title"
          >
            <h2 id="destinations-title" className="text-lg font-semibold">
              Publication destinations
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Launch destinations are configured through the approved, versioned
              destination-policy catalog. This record cannot invent an arbitrary
              destination.
            </p>
          </section>

          <section
            className="surface-panel"
            aria-labelledby="notion-link-title"
          >
            <p className="eyebrow">Notion metadata record</p>
            <h2 id="notion-link-title" className="mt-2 text-lg font-semibold">
              Cap-It-Up link
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Notion retains posting metadata. Caption text and approvals stay
              in CapItUp. Syncing the link never sends caption content to
              Notion.
            </p>
            {item.canEdit && (
              <form action={syncCapItUpLinkAction} className="mt-4">
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="contentItemId" value={item.id} />
                <button className={secondaryButtonClassName} type="submit">
                  Retry Link Sync
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </ProjectWorkspace>
  );
}
