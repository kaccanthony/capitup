import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { listAccessibleProjects } from "@/features/projects/data";
import {
  primaryButtonClassName,
  ProjectWorkspace,
} from "@/features/projects/project-workspace";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  let result: Awaited<ReturnType<typeof listAccessibleProjects>>;

  try {
    result = await listAccessibleProjects();
  } catch {
    redirect("/access-denied");
  }

  return (
    <ProjectWorkspace
      eyebrow="Authorized workspace"
      title="Projects"
      description="Organization-scoped projects and the content records you are permitted to access."
      actions={
        result.canCreateProject ? (
          <Link className={primaryButtonClassName} href="/projects/new">
            <Plus aria-hidden="true" className="mr-2 size-4" />
            New project
          </Link>
        ) : undefined
      }
    >
      {result.projects.length === 0 ? (
        <section
          className="surface-panel text-center"
          aria-labelledby="empty-projects-title"
        >
          <h2 id="empty-projects-title" className="text-xl font-semibold">
            No accessible projects yet
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--text-secondary)]">
            A publicity director or organization administrator can create a
            project and grant a temporal assignment. Project identifiers alone
            never grant access.
          </p>
        </section>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {result.projects.map((project) => (
            <li className="surface-panel" key={project.id}>
              <article>
                <p className="eyebrow">Project</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em]">
                  {project.title}
                </h2>
                <p className="mt-2 min-h-12 text-sm leading-6 text-[var(--text-secondary)]">
                  {project.description ??
                    "No project description has been added."}
                </p>
                <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/8 pt-4">
                  <span className="text-xs text-[var(--text-muted)]">
                    Record version {project.recordVersion}
                  </span>
                  <Link
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--lavender-soft)] hover:text-white"
                    href={`/projects/${project.id}`}
                  >
                    Open project
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </ProjectWorkspace>
  );
}
