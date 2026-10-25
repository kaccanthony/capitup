import { describe, expect, it } from "vitest";
import {
  canCreateContent,
  canEditContent,
  canManageProject,
  canViewProject,
  type ProjectAuthorizationContext,
} from "@/features/projects/policy";

const organizationA = "11111111-1111-4111-8111-111111111111";
const organizationB = "22222222-2222-4222-8222-222222222222";

function context(
  overrides: Partial<ProjectAuthorizationContext> = {},
): ProjectAuthorizationContext {
  return {
    actorOrganizationId: organizationA,
    resourceOrganizationId: organizationA,
    organizationRoles: ["junior_officer"],
    projectAssignments: ["writer"],
    contentResponsibilities: ["writer"],
    ...overrides,
  };
}

describe("Phase 03 project and content authorization", () => {
  it("isolates projects across organizations", () => {
    const crossOrganization = context({
      resourceOrganizationId: organizationB,
      organizationRoles: ["org_admin", "publicity_director"],
      projectAssignments: ["project_head"],
    });

    expect(canViewProject(crossOrganization)).toBe(false);
    expect(canManageProject(crossOrganization)).toBe(false);
    expect(canCreateContent(crossOrganization)).toBe(false);
    expect(canEditContent(crossOrganization)).toBe(false);
  });

  it("keeps viewers read-only", () => {
    const viewer = context({ projectAssignments: ["viewer"] });

    expect(canViewProject(viewer)).toBe(true);
    expect(canCreateContent(viewer)).toBe(false);
    expect(canEditContent(viewer)).toBe(false);
  });

  it("requires writer responsibility for content edits", () => {
    expect(canCreateContent(context({ contentResponsibilities: [] }))).toBe(
      true,
    );
    expect(canEditContent(context({ contentResponsibilities: [] }))).toBe(
      false,
    );
    expect(canEditContent(context())).toBe(true);
  });

  it("keeps executives read-only without a head assignment", () => {
    const unassigned = context({
      organizationRoles: ["executive"],
      projectAssignments: [],
    });
    const assignedWriter = context({
      organizationRoles: ["executive"],
      projectAssignments: ["writer"],
    });

    expect(canViewProject(unassigned)).toBe(false);
    expect(canCreateContent(unassigned)).toBe(false);
    expect(canCreateContent(assignedWriter)).toBe(false);
    expect(canEditContent(assignedWriter)).toBe(false);
  });

  it("makes an executive actionable only with a head assignment and content responsibility", () => {
    const executiveHead = context({
      organizationRoles: ["executive"],
      projectAssignments: ["project_head"],
      contentResponsibilities: [],
    });

    expect(canViewProject(executiveHead)).toBe(true);
    expect(canCreateContent(executiveHead)).toBe(true);
    expect(canEditContent(executiveHead)).toBe(false);
    expect(
      canEditContent({
        ...executiveHead,
        contentResponsibilities: ["writer"],
      }),
    ).toBe(true);
  });

  it("separates technical administration from editorial capability", () => {
    const administrator = context({
      organizationRoles: ["org_admin"],
      projectAssignments: [],
      contentResponsibilities: [],
    });

    expect(canManageProject(administrator)).toBe(true);
    expect(canViewProject(administrator)).toBe(true);
    expect(canCreateContent(administrator)).toBe(false);
    expect(canEditContent(administrator)).toBe(false);
  });

  it("allows publicity directors to administer assignments without substituting an organization role", () => {
    const director = context({
      organizationRoles: ["publicity_director"],
      projectAssignments: [],
      contentResponsibilities: [],
    });

    expect(canManageProject(director)).toBe(true);
    expect(canCreateContent(director)).toBe(false);
  });
});
