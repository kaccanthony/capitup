import { describe, expect, it } from "vitest";
import {
  canAdministerOrganization,
  classifyMembershipAccess,
  hasOrganizationRole,
  type MembershipAccessRecord,
} from "@/lib/auth/policy";
import { safeInternalRedirect } from "@/lib/auth/redirects";

const organizationA = "11111111-1111-4111-8111-111111111111";
const organizationB = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";

function membership(
  overrides: Partial<MembershipAccessRecord> = {},
): MembershipAccessRecord {
  return {
    membership_id: "44444444-4444-4444-8444-444444444444",
    organization_id: organizationA,
    membership_status: "active",
    valid_from: "2026-01-01T00:00:00.000Z",
    valid_until: null,
    roles: ["junior_officer"],
    is_active: true,
    ...overrides,
  };
}

describe("Phase 02 membership authorization", () => {
  it("allows an authenticated active member", () => {
    const decision = classifyMembershipAccess({
      configured: true,
      userId,
      memberships: [membership()],
    });

    expect(decision).toMatchObject({
      kind: "active",
      userId,
      organizationId: organizationA,
    });
    expect(hasOrganizationRole(decision, "junior_officer")).toBe(true);
  });

  it("rejects an unauthenticated user", () => {
    expect(
      classifyMembershipAccess({
        configured: true,
        userId: null,
        memberships: [],
      }),
    ).toEqual({ kind: "unauthenticated" });
  });

  it("rejects an authenticated user without a membership", () => {
    expect(
      classifyMembershipAccess({
        configured: true,
        userId,
        memberships: [],
      }),
    ).toEqual({ kind: "unauthorized", userId });
  });

  it.each(["suspended", "expired"] as const)(
    "rejects a %s member as disabled",
    (membershipStatus) => {
      expect(
        classifyMembershipAccess({
          configured: true,
          userId,
          memberships: [
            membership({
              membership_status: membershipStatus,
              is_active: false,
            }),
          ],
        }),
      ).toEqual({ kind: "disabled", userId });
    },
  );

  it("rejects an active status outside its validity window", () => {
    expect(
      classifyMembershipAccess({
        configured: true,
        userId,
        memberships: [membership({ is_active: false })],
      }),
    ).toEqual({ kind: "disabled", userId });
  });

  it("prevents role escalation and cross-organization administration", () => {
    const executive = classifyMembershipAccess({
      configured: true,
      userId,
      memberships: [membership({ roles: ["executive"] })],
    });
    const administrator = classifyMembershipAccess({
      configured: true,
      userId,
      memberships: [membership({ roles: ["org_admin"] })],
    });

    expect(canAdministerOrganization(executive, organizationA)).toBe(false);
    expect(canAdministerOrganization(administrator, organizationB)).toBe(false);
    expect(canAdministerOrganization(administrator, organizationA)).toBe(true);
  });
});

describe("authentication redirect safety", () => {
  it("accepts only same-origin relative paths", () => {
    expect(safeInternalRedirect("/captions?filter=mine")).toBe(
      "/captions?filter=mine",
    );
    expect(safeInternalRedirect("https://attacker.example")).toBe("/");
    expect(safeInternalRedirect("//attacker.example/path")).toBe("/");
    expect(safeInternalRedirect("javascript:alert(1)")).toBe("/");
  });
});
