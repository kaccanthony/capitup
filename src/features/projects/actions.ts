"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addDeliverable,
  assignContentResponsibility,
  assignProjectMember,
  createContentItem,
  createProject,
  updateContentItem,
  updateProject,
} from "@/features/projects/data";
import {
  contentResponsibilityInputSchema,
  contentCreateSchema,
  contentUpdateSchema,
  deliverableInputSchema,
  projectInputSchema,
  projectAssignmentInputSchema,
  projectUpdateSchema,
} from "@/features/projects/schemas";

function checkboxValue(value: FormDataEntryValue | null) {
  return value === "on";
}

export async function createProjectAction(formData: FormData) {
  const parsed = projectInputSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
  });

  if (!parsed.success) {
    redirect("/projects/new?notice=invalid");
  }

  let projectId: string;
  try {
    projectId = await createProject(parsed.data);
  } catch {
    redirect("/access-denied");
  }

  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}

export async function updateProjectAction(formData: FormData) {
  const parsed = projectUpdateSchema.safeParse({
    projectId: formData.get("projectId"),
    expectedVersion: formData.get("expectedVersion"),
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
  });

  if (!parsed.success) {
    redirect("/projects?notice=invalid");
  }

  try {
    await updateProject(parsed.data);
  } catch {
    redirect("/access-denied");
  }

  revalidatePath(`/projects/${parsed.data.projectId}`);
  redirect(`/projects/${parsed.data.projectId}?notice=updated`);
}

export async function createContentItemAction(formData: FormData) {
  const parsed = contentCreateSchema.safeParse({
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    kind: formData.get("kind"),
    tags: formData.getAll("tags"),
    isSpecialCase: checkboxValue(formData.get("isSpecialCase")),
    specialCaseReason: formData.get("specialCaseReason") ?? undefined,
  });

  if (!parsed.success) {
    const projectId = formData.get("projectId");
    const target = typeof projectId === "string" ? projectId : "";
    redirect(
      `/projects/${encodeURIComponent(target)}/content/new?notice=invalid`,
    );
  }

  let contentItemId: string;
  try {
    contentItemId = await createContentItem(parsed.data);
  } catch {
    redirect("/access-denied");
  }

  revalidatePath(`/projects/${parsed.data.projectId}`);
  redirect(`/projects/${parsed.data.projectId}/content/${contentItemId}`);
}

export async function updateContentItemAction(formData: FormData) {
  const parsed = contentUpdateSchema.safeParse({
    projectId: formData.get("projectId"),
    contentItemId: formData.get("contentItemId"),
    expectedVersion: formData.get("expectedVersion"),
    title: formData.get("title"),
    kind: formData.get("kind"),
    tags: formData.getAll("tags"),
    isSpecialCase: checkboxValue(formData.get("isSpecialCase")),
    specialCaseReason: formData.get("specialCaseReason") ?? undefined,
  });

  if (!parsed.success) {
    redirect("/projects?notice=invalid");
  }

  try {
    await updateContentItem(parsed.data);
  } catch {
    redirect("/access-denied");
  }

  const path = `/projects/${parsed.data.projectId}/content/${parsed.data.contentItemId}`;
  revalidatePath(path);
  redirect(`${path}?notice=updated`);
}

export async function addDeliverableAction(formData: FormData) {
  const parsed = deliverableInputSchema.safeParse({
    projectId: formData.get("projectId"),
    contentItemId: formData.get("contentItemId"),
    label: formData.get("label"),
    url: formData.get("url"),
    sourceCommittee: formData.get("sourceCommittee"),
    deliverableType: formData.get("deliverableType"),
    status: formData.get("status") ?? undefined,
  });

  if (!parsed.success) {
    redirect("/projects?notice=invalid");
  }

  try {
    await addDeliverable(parsed.data);
  } catch {
    redirect("/access-denied");
  }

  const path = `/projects/${parsed.data.projectId}/content/${parsed.data.contentItemId}`;
  revalidatePath(path);
  redirect(`${path}?notice=deliverable-added`);
}

export async function assignProjectMemberAction(formData: FormData) {
  const parsed = projectAssignmentInputSchema.safeParse({
    projectId: formData.get("projectId"),
    membershipId: formData.get("membershipId"),
    role: formData.get("role"),
    endsAt: formData.get("endsAt") || null,
  });

  if (!parsed.success) {
    redirect("/projects?notice=invalid");
  }

  try {
    await assignProjectMember(parsed.data);
  } catch {
    redirect("/access-denied");
  }

  revalidatePath(`/projects/${parsed.data.projectId}`);
  redirect(`/projects/${parsed.data.projectId}?notice=assignment-added`);
}

export async function assignContentResponsibilityAction(formData: FormData) {
  const parsed = contentResponsibilityInputSchema.safeParse({
    projectId: formData.get("projectId"),
    contentItemId: formData.get("contentItemId"),
    projectAssignmentId: formData.get("projectAssignmentId"),
    responsibility: formData.get("responsibility"),
  });

  if (!parsed.success) {
    redirect("/projects?notice=invalid");
  }

  try {
    await assignContentResponsibility(parsed.data);
  } catch {
    redirect("/access-denied");
  }

  const path = `/projects/${parsed.data.projectId}/content/${parsed.data.contentItemId}`;
  revalidatePath(path);
  redirect(`${path}?notice=responsibility-added`);
}
