import "server-only";

import { canAdministerOrganization } from "@/lib/auth/policy";
import {
  invitationInputSchema,
  membershipStatusInputSchema,
  roleChangeInputSchema,
  roleRevocationInputSchema,
} from "@/lib/auth/schemas";
import { getAuthorizationForClient } from "@/lib/auth/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export class MembershipAdministrationError extends Error {
  constructor() {
    super("The membership operation could not be completed.");
    this.name = "MembershipAdministrationError";
  }
}

async function getAuthorizedClient(organizationId: string) {
  const client = await createServerSupabaseClient();

  if (!client) {
    throw new MembershipAdministrationError();
  }

  const decision = await getAuthorizationForClient(client);

  if (!canAdministerOrganization(decision, organizationId)) {
    throw new MembershipAdministrationError();
  }

  return client;
}

export async function createMemberInvitation(input: unknown) {
  const parsed = invitationInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new MembershipAdministrationError();
  }

  const client = await getAuthorizedClient(parsed.data.organizationId);
  const { data, error } = await client.rpc("create_member_invitation", {
    p_organization_id: parsed.data.organizationId,
    p_email: parsed.data.email,
    p_initial_role: parsed.data.initialRole,
    p_valid_until: parsed.data.validUntil,
  });

  if (error || !data) {
    throw new MembershipAdministrationError();
  }

  return data;
}

export async function setMemberStatus(input: unknown) {
  const parsed = membershipStatusInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new MembershipAdministrationError();
  }

  const client = await getAuthorizedClient(parsed.data.organizationId);
  const { data, error } = await client.rpc("set_membership_status", {
    p_membership_id: parsed.data.membershipId,
    p_status: parsed.data.status,
    p_reason: parsed.data.reason,
  });

  if (error || !data) {
    throw new MembershipAdministrationError();
  }
}

export async function grantOrganizationRole(input: unknown) {
  const parsed = roleChangeInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new MembershipAdministrationError();
  }

  const client = await getAuthorizedClient(parsed.data.organizationId);
  const { data, error } = await client.rpc("grant_organization_role", {
    p_membership_id: parsed.data.membershipId,
    p_role: parsed.data.role,
    p_reason: parsed.data.reason,
  });

  if (error || !data) {
    throw new MembershipAdministrationError();
  }

  return data;
}

export async function revokeOrganizationRole(input: unknown) {
  const parsed = roleRevocationInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new MembershipAdministrationError();
  }

  const client = await getAuthorizedClient(parsed.data.organizationId);
  const { data, error } = await client.rpc("revoke_organization_role", {
    p_role_assignment_id: parsed.data.roleAssignmentId,
    p_reason: parsed.data.reason,
  });

  if (error || !data) {
    throw new MembershipAdministrationError();
  }
}
