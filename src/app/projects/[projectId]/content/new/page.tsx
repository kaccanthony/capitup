import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createContentItemAction } from "@/features/projects/actions";
import { ContentForm } from "@/features/projects/content-form";
import {
  getAccessibleProject,
  getControlledTaxonomy,
} from "@/features/projects/data";
import {
  ProjectWorkspace,
  secondaryButtonClassName,
} from "@/features/projects/project-workspace";

export const metadata: Metadata = { title: "New content record" };

export default async function NewContentPage({
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

  if (!project?.canCreateContent) redirect("/access-denied");

  return (
    <ProjectWorkspace
      eyebrow="Project content"
      title="Create content record"
      description={`Add controlled metadata to ${project.title}. Caption drafting remains outside this phase.`}
      actions={
        <Link
          className={secondaryButtonClassName}
          href={`/projects/${project.id}`}
        >
          Cancel
        </Link>
      }
    >
      <section
        className="surface-panel max-w-3xl"
        aria-labelledby="content-form-title"
      >
        <h2 id="content-form-title" className="text-xl font-semibold">
          Content metadata
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          New records start as drafts. Workflow statuses cannot be selected
          here.
        </p>
        <div className="mt-6">
          <ContentForm
            action={createContentItemAction}
            projectId={project.id}
            taxonomy={taxonomy}
            submitLabel="Create content record"
          />
        </div>
      </section>
    </ProjectWorkspace>
  );
}
