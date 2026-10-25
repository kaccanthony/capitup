import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createProjectAction } from "@/features/projects/actions";
import { listAccessibleProjects } from "@/features/projects/data";
import {
  fieldClassName,
  primaryButtonClassName,
  ProjectWorkspace,
  secondaryButtonClassName,
} from "@/features/projects/project-workspace";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage() {
  try {
    const access = await listAccessibleProjects();
    if (!access.canCreateProject) redirect("/access-denied");
  } catch {
    redirect("/access-denied");
  }

  return (
    <ProjectWorkspace
      eyebrow="Project administration"
      title="Create project"
      description="Create the organization-owned record first, then grant explicit temporal project assignments."
      actions={
        <Link className={secondaryButtonClassName} href="/projects">
          Cancel
        </Link>
      }
    >
      <section
        className="surface-panel max-w-2xl"
        aria-labelledby="project-form-title"
      >
        <h2 id="project-form-title" className="text-xl font-semibold">
          Project details
        </h2>
        <form action={createProjectAction} className="mt-6 space-y-5">
          <label className="block text-sm font-medium">
            Project title
            <input
              className={fieldClassName}
              name="title"
              required
              maxLength={160}
            />
          </label>
          <label className="block text-sm font-medium">
            Description{" "}
            <span className="text-[var(--text-muted)]">(optional)</span>
            <textarea
              className={fieldClassName}
              name="description"
              rows={5}
              maxLength={2000}
            />
          </label>
          <button className={primaryButtonClassName} type="submit">
            Create project
          </button>
        </form>
      </section>
    </ProjectWorkspace>
  );
}
