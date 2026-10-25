import type {
  ContentResponsibility,
  OrganizationRole,
  ProjectAssignmentRole,
} from "@/types/database";

const editorialOrganizationRoles: readonly OrganizationRole[] = [
  "junior_officer",
  "publicity_director",
  "pro",
];

const headAssignments: readonly ProjectAssignmentRole[] = [
  "publicity_head",
  "co_project_head",
  "project_head",
];

export type ProjectAuthorizationContext = {
  actorOrganizationId: string;
  resourceOrganizationId: string;
  organizationRoles: readonly OrganizationRole[];
  projectAssignments: readonly ProjectAssignmentRole[];
  contentResponsibilities?: readonly ContentResponsibility[];
};

export function canManageProject(context: ProjectAuthorizationContext) {
  return (
    context.actorOrganizationId === context.resourceOrganizationId &&
    (context.organizationRoles.includes("publicity_director") ||
      context.organizationRoles.includes("org_admin"))
  );
}

export function canViewProject(context: ProjectAuthorizationContext) {
  return (
    context.actorOrganizationId === context.resourceOrganizationId &&
    (canManageProject(context) || context.projectAssignments.length > 0)
  );
}

export function canCreateContent(context: ProjectAuthorizationContext) {
  if (context.actorOrganizationId !== context.resourceOrganizationId) {
    return false;
  }

  const actionableAssignment = context.projectAssignments.some(
    (role) => role !== "viewer",
  );
  const ordinaryEditorialActor = context.organizationRoles.some((role) =>
    editorialOrganizationRoles.includes(role),
  );
  const actionableExecutive =
    context.organizationRoles.includes("executive") &&
    context.projectAssignments.some((role) => headAssignments.includes(role));

  return (
    actionableAssignment && (ordinaryEditorialActor || actionableExecutive)
  );
}

export function canEditContent(context: ProjectAuthorizationContext) {
  return (
    canCreateContent(context) &&
    Boolean(context.contentResponsibilities?.includes("writer"))
  );
}
