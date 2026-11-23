import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getCollaborationWorkspace } from "@/features/collaboration/data";
import {
  getAccessibleContentItem,
  getAccessibleProject,
} from "@/features/projects/data";
import { ProjectWorkspace } from "@/features/projects/project-workspace";
import { CopyCaptionButton } from "@/features/projects/copy-caption-button";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Caption viewer" };

async function getLatestCaptionContent(
  contentItemId: string,
): Promise<{ plainText: string; editorJson: unknown } | null> {
  const client = await createServerSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from("caption_versions")
    .select("editor_json, plain_text, version_number")
    .eq("content_item_id", contentItemId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    plainText: data.plain_text,
    editorJson: data.editor_json,
  };
}

export default async function CaptionViewerPage({
  params,
}: {
  params: Promise<{ projectId: string; contentId: string }>;
}) {
  const { projectId, contentId } = await params;
  let item: Awaited<ReturnType<typeof getAccessibleContentItem>>;
  let project: Awaited<ReturnType<typeof getAccessibleProject>>;
  let collaboration: Awaited<ReturnType<typeof getCollaborationWorkspace>>;

  try {
    [item, project] = await Promise.all([
      getAccessibleContentItem(projectId, contentId),
      getAccessibleProject(projectId),
    ]);
  } catch {
    redirect("/access-denied");
  }

  if (!item || !project) redirect("/access-denied");

  try {
    collaboration = await getCollaborationWorkspace(item);
  } catch {
    redirect("/access-denied");
  }

  const latestVersion = collaboration.latestReview;
  const captionContent = latestVersion
    ? await getLatestCaptionContent(item.id)
    : null;

  return (
    <ProjectWorkspace
      eyebrow={`${item.kind} · ${item.status.replaceAll("_", " ")} (read-only)`}
      title={item.title}
      description="Read-only view of the latest authorized caption version. Liveblocks collaboration is disabled in this view."
      actions={
        <a
          className="secondary-button"
          href={`/projects/${project.id}/content/${item.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in CapItUp
          <ExternalLink aria-hidden="true" className="size-3.5 ml-1" />
        </a>
      }
    >
      <div className="space-y-5 max-w-4xl">
        <section
          className="surface-panel"
          aria-labelledby="viewer-metadata-title"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Caption record</p>
              <h2
                id="viewer-metadata-title"
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
            {latestVersion && (
              <>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    Latest submitted version
                  </dt>
                  <dd className="mt-2 font-semibold">
                    Version {latestVersion.versionNumber}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    Approval status
                  </dt>
                  <dd className="mt-2 capitalize text-sm leading-6 text-[var(--text-secondary)]">
                    {latestVersion.status.replaceAll("_", " ")}
                    {latestVersion.currentStep
                      ? ` · ${latestVersion.currentStep}`
                      : ""}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </section>

        <section
          className="surface-panel"
          aria-labelledby="viewer-caption-title"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Approved content</p>
              <h2
                id="viewer-caption-title"
                className="mt-2 text-xl font-semibold"
              >
                Caption
              </h2>
            </div>
            {latestVersion && (
              <div className="flex items-center gap-3">
                <span className="status-badge status-approved">
                  Version {latestVersion.versionNumber}
                </span>
                {captionContent?.plainText && (
                  <CopyCaptionButton caption={captionContent.plainText} />
                )}
              </div>
            )}
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
            This view renders the latest authorized Supabase snapshot without
            issuing a Liveblocks write token. Edits are not possible here.
          </p>
          <div className="mt-5 min-h-72 rounded-xl border border-white/10 bg-black/15 p-4 text-sm leading-7">
            {latestVersion && captionContent ? (
              <>
                <pre className="whitespace-pre-wrap break-words font-sans">
                  {captionContent.plainText ?? "No caption text available."}
                </pre>
              </>
            ) : latestVersion ? (
              <p className="text-sm text-[var(--text-muted)]">
                Caption content not available.
              </p>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                No version has been submitted for review yet.
              </p>
            )}
          </div>
        </section>

        {latestVersion && (
          <section
            className="surface-panel"
            aria-labelledby="viewer-evidence-title"
          >
            <h2 id="viewer-evidence-title" className="text-lg font-semibold">
              Submission evidence
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Word count
                </dt>
                <dd className="mt-1 font-mono text-lg">
                  {latestVersion.evidence?.wordCount ?? "Legacy"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Grapheme count
                </dt>
                <dd className="mt-1 font-mono text-lg">
                  {latestVersion.evidence?.graphemeCount ?? "Legacy"}
                </dd>
              </div>
              {latestVersion.evidence?.wordPolicies.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    Word policies
                  </dt>
                  <dd className="mt-2 space-y-2">
                    {latestVersion.evidence.wordPolicies.map((policy) => (
                      <div
                        key={policy.policyId}
                        className="rounded-lg border border-white/8 px-3 py-2 text-xs"
                      >
                        <span className="font-semibold">
                          Word policy {policy.policyVersion}
                        </span>{" "}
                        <span className="text-[var(--text-muted)]">
                          · {policy.warningState.replaceAll("_", " ")} ·
                          recommendation {policy.recommendedWordLimit} · hard
                          maximum {policy.globalHardMaximumWords}
                        </span>
                        {policy.recommendationExempt && (
                          <p className="mt-1 text-[var(--attention)]">
                            Special-case exemption: {policy.exemptionReason}
                          </p>
                        )}
                      </div>
                    ))}
                  </dd>
                </div>
              )}
              {latestVersion.evidence?.destinations.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    Destination policies
                  </dt>
                  <dd className="mt-2 space-y-2">
                    {latestVersion.evidence.destinations.map((destination) => (
                      <div
                        key={destination.publicationChannelId}
                        className="rounded-lg border border-white/8 px-3 py-2 text-xs"
                      >
                        <span className="font-semibold">
                          {destination.label}
                        </span>{" "}
                        <span className="text-[var(--text-muted)]">
                          · {destination.warningState.replaceAll("_", " ")} ·{" "}
                          {destination.graphemeCount} characters
                          {destination.characterLimit === null
                            ? " · policy unconfigured"
                            : ` / ${destination.characterLimit} · ${destination.policyVersion}`}
                        </span>
                      </div>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </section>
        )}

        <section
          className="surface-panel"
          aria-labelledby="viewer-deliverables-title"
        >
          <h2 id="viewer-deliverables-title" className="text-lg font-semibold">
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
        </section>
      </div>
    </ProjectWorkspace>
  );
}
