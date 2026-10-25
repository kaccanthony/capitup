import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import {
  assignProjectMemberAction,
  updateProjectAction,
} from "@/features/projects/actions";
import {
  getAccessibleProject,
  getControlledTaxonomy,
} from "@/features/projects/data";
import {
  fieldClassName,
  primaryButtonClassName,
  ProjectWorkspace,
  secondaryButtonClassName,
} from "@/features/projects/project-workspace";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  let project: Awaited<ReturnType<typeof getAccessibleProject>>;
  let taxonomy: Awaited<ReturnType<typeof getControlledTaxonomy>>;

  try {
    [project, taxonomy] = await Promise.all([
      getAccessibleProject(projectId),
      getControlledTaxonomy(),
    ]);
  } catch {
    redirect("/access-denied");
  }

  if (!project) redirect("/access-denied");

  const kindById = new Map(
    taxonomy.map((option, index) => [index + 1, option.label]),
  );

  return (
    <ProjectWorkspace
      eyebrow="Project record"
      title={project.title}
      description={
        project.description ?? "No project description has been added."
      }
      actions={
        <>
          <Link className={secondaryButtonClassName} href="/projects">
            All projects
          </Link>
          {project.canCreateContent && (
            <Link
              className={primaryButtonClassName}
              href={`/projects/${project.id}/content/new`}
            >
              <Plus aria-hidden="true" className="mr-2 size-4" />
              New content
            </Link>
          )}
        </>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)]">
        <section
          className="surface-panel"
          aria-labelledby="content-records-title"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Project workspace</p>
              <h2
                id="content-records-title"
                className="mt-2 text-xl font-semibold"
              >
                Content records
              </h2>
            </div>
            <span className="section-count">{project.contentItems.length}</span>
          </div>
          {project.contentItems.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-white/12 p-5 text-sm text-[var(--text-secondary)]">
              No content records are visible in this project.
            </p>
          ) : (
            <ul className="mt-5 divide-y divide-white/8">
              {project.contentItems.map((item) => (
                <li className="py-4 first:pt-0" key={item.id}>
                  <Link
                    className="group flex items-start justify-between gap-4"
                    href={`/projects/${project.id}/content/${item.id}`}
                  >
                    <span>
                      <span className="block font-semibold group-hover:text-[var(--lavender-soft)]">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-xs text-[var(--text-muted)]">
                        {kindById.get(item.formatId) ?? "Controlled kind"} ·{" "}
                        {item.status.replaceAll("_", " ")}
                        {item.isSpecialCase ? " · Special case" : ""}
                      </span>
                    </span>
                    <span className="text-sm text-[var(--lavender-soft)]">
                      View
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-5">
          <section
            className="surface-panel"
            aria-labelledby="assignment-summary-title"
          >
            <p className="eyebrow">Access scope</p>
            <h2
              id="assignment-summary-title"
              className="mt-2 text-lg font-semibold"
            >
              Project assignments
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {project.assignments.length} current visible assignment
              {project.assignments.length === 1 ? "" : "s"}. Organization roles
              remain separate.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {project.assignments.map((assignment) => (
                <li className="status-badge status-draft" key={assignment.id}>
                  {assignment.role.replaceAll("_", " ")}
                </li>
              ))}
            </ul>
          </section>

          {project.canManage && (
            <>
              <section
                className="surface-panel"
                aria-labelledby="project-edit-title"
              >
                <h2 id="project-edit-title" className="text-lg font-semibold">
                  Edit project
                </h2>
                <form action={updateProjectAction} className="mt-5 space-y-4">
                  <input type="hidden" name="projectId" value={project.id} />
                  <input
                    type="hidden"
                    name="expectedVersion"
                    value={project.recordVersion}
                  />
                  <label className="block text-sm font-medium">
                    Title
                    <input
                      className={fieldClassName}
                      name="title"
                      defaultValue={project.title}
                      required
                      maxLength={160}
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Description
                    <textarea
                      className={fieldClassName}
                      name="description"
                      defaultValue={project.description ?? ""}
                      rows={4}
                      maxLength={2000}
                    />
                  </label>
                  <button className={primaryButtonClassName} type="submit">
                    Save project
                  </button>
                </form>
              </section>

              <section
                className="surface-panel"
                aria-labelledby="assign-member-title"
              >
                <h2 id="assign-member-title" className="text-lg font-semibold">
                  Grant project assignment
                </h2>
                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                  Use the active organization membership ID from the reviewed
                  access-administration workflow.
                </p>
                <form
                  action={assignProjectMemberAction}
                  className="mt-5 space-y-4"
                >
                  <input type="hidden" name="projectId" value={project.id} />
                  <label className="block text-sm font-medium">
                    Membership ID
                    <input
                      className={fieldClassName}
                      name="membershipId"
                      required
                      inputMode="text"
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Project role
                    <select
                      className={fieldClassName}
                      name="role"
                      defaultValue="viewer"
                    >
                      <option value="publicity_head">Publicity head</option>
                      <option value="co_project_head">Co-project head</option>
                      <option value="project_head">Project head</option>
                      <option value="writer">Writer</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium">
                    Ends at{" "}
                    <span className="text-[var(--text-muted)]">
                      (optional ISO timestamp)
                    </span>
                    <input
                      className={fieldClassName}
                      name="endsAt"
                      placeholder="2026-12-31T16:00:00.000Z"
                    />
                  </label>
                  <button className={primaryButtonClassName} type="submit">
                    Grant assignment
                  </button>
                </form>
              </section>
            </>
          )}
        </div>
      </div>
    </ProjectWorkspace>
  );
}
