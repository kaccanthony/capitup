import type {
  OrganizationMembershipStatus,
  OrganizationRole,
} from "@/types/database";

export type MembershipAccessRecord = {
  membership_id: string;
  organization_id: string;
  membership_status: OrganizationMembershipStatus;
  valid_from: string;
  valid_until: string | null;
  roles: OrganizationRole[];
  is_active: boolean;
};

export type AuthorizationDecision =
  | { kind: "unconfigured" }
  | { kind: "unauthenticated" }
  | { kind: "unauthorized"; userId: string }
  | { kind: "disabled"; userId: string }
  | {
      kind: "active";
      userId: string;
      membershipId: string;
      organizationId: string;
      roles: readonly OrganizationRole[];
    };

export function classifyMembershipAccess({
  configured,
  userId,
  memberships,
}: {
  configured: boolean;
  userId: string | null;
  memberships: readonly MembershipAccessRecord[];
}): AuthorizationDecision {
  if (!configured) {
    return { kind: "unconfigured" };
  }

  if (!userId) {
    return { kind: "unauthenticated" };
  }

  const activeMembership = memberships.find(
    (membership) =>
      membership.membership_status === "active" && membership.is_active,
  );

  if (activeMembership) {
    return {
      kind: "active",
      userId,
      membershipId: activeMembership.membership_id,
      organizationId: activeMembership.organization_id,
      roles: activeMembership.roles,
    };
  }

  if (
    memberships.some(
      (membership) =>
        membership.membership_status === "suspended" ||
        membership.membership_status === "expired" ||
        membership.membership_status === "active",
    )
  ) {
    return { kind: "disabled", userId };
  }

  return { kind: "unauthorized", userId };
}

export function canAdministerOrganization(
  decision: AuthorizationDecision,
  organizationId: string,
) {
  return (
    decision.kind === "active" &&
    decision.organizationId === organizationId &&
    decision.roles.includes("org_admin")
  );
}

export function hasOrganizationRole(
  decision: AuthorizationDecision,
  role: OrganizationRole,
) {
  return decision.kind === "active" && decision.roles.includes(role);
}
