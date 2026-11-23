"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthorizationForClient } from "@/lib/auth/authorization";
import { canAdministerOrganization } from "@/lib/auth/policy";

const settingsPath = "/settings/governance";

async function requireAdmin(organizationId: string) {
  const client = await createServerSupabaseClient();
  if (!client) throw new Error("Database unavailable");

  const decision = await getAuthorizationForClient(client);
  if (decision.kind !== "active" || !canAdministerOrganization(decision, organizationId)) {
    throw new Error("Not authorized");
  }
  return client;
}

function callRpc(client: Awaited<ReturnType<typeof createServerSupabaseClient>>, fn: string, params: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).rpc(fn, params);
}

export async function grantPresidentDesignationAction(formData: FormData) {
  const organizationId = formData.get("organizationId") as string;
  const membershipId = formData.get("membershipId") as string;
  const reason = formData.get("reason") as string;

  if (!organizationId || !membershipId || !reason?.trim()) {
    redirect(`${settingsPath}?notice=invalid`);
  }

  const client = await requireAdmin(organizationId);

  try {
    const { error } = await callRpc(client, "change_president_designation", {
      p_membership_id: membershipId,
      p_grant: true,
      p_reason: reason.trim(),
    });
    if (error) throw error;
  } catch {
    redirect(`${settingsPath}?notice=grant-failed`);
  }

  revalidatePath(settingsPath);
  redirect(`${settingsPath}?notice=granted`);
}

export async function revokePresidentDesignationAction(formData: FormData) {
  const organizationId = formData.get("organizationId") as string;
  const membershipId = formData.get("membershipId") as string;
  const reason = formData.get("reason") as string;

  if (!organizationId || !membershipId || !reason?.trim()) {
    redirect(`${settingsPath}?notice=invalid`);
  }

  const client = await requireAdmin(organizationId);

  try {
    const { error } = await callRpc(client, "change_president_designation", {
      p_membership_id: membershipId,
      p_grant: false,
      p_reason: reason.trim(),
    });
    if (error) throw error;
  } catch {
    redirect(`${settingsPath}?notice=revoke-failed`);
  }

  revalidatePath(settingsPath);
  redirect(`${settingsPath}?notice=revoked`);
}

export async function markJuniorOfficerUnavailableAction(formData: FormData) {
  const organizationId = formData.get("organizationId") as string;
  const membershipId = formData.get("membershipId") as string;
  const reason = formData.get("reason") as string;
  const endsAt = formData.get("endsAt") as string | null;

  if (!organizationId || !membershipId || !reason?.trim()) {
    redirect(`${settingsPath}?notice=invalid`);
  }

  const client = await requireAdmin(organizationId);

  try {
    const { error } = await callRpc(client, "change_junior_officer_unavailability", {
      p_membership_id: membershipId,
      p_unavailable: true,
      p_reason: reason.trim(),
      p_ends_at: endsAt || null,
    });
    if (error) throw error;
  } catch {
    redirect(`${settingsPath}?notice=unavailable-failed`);
  }

  revalidatePath(settingsPath);
  redirect(`${settingsPath}?notice=unavailable-marked`);
}

export async function revokeJuniorOfficerUnavailableAction(formData: FormData) {
  const organizationId = formData.get("organizationId") as string;
  const membershipId = formData.get("membershipId") as string;
  const reason = formData.get("reason") as string;

  if (!organizationId || !membershipId || !reason?.trim()) {
    redirect(`${settingsPath}?notice=invalid`);
  }

  const client = await requireAdmin(organizationId);

  try {
    const { error } = await callRpc(client, "change_junior_officer_unavailability", {
      p_membership_id: membershipId,
      p_unavailable: false,
      p_reason: reason.trim(),
    });
    if (error) throw error;
  } catch {
    redirect(`${settingsPath}?notice=unavailable-revoke-failed`);
  }

  revalidatePath(settingsPath);
  redirect(`${settingsPath}?notice=unavailable-revoked`);
}

export async function getGovernanceOverviewAction(formData: FormData) {
  const organizationId = formData.get("organizationId") as string;

  if (!organizationId) {
    return { error: "Invalid organization" };
  }

  const client = await createServerSupabaseClient();
  if (!client) return { error: "Database unavailable" };

  const decision = await getAuthorizationForClient(client);
  if (decision.kind !== "active" || decision.organizationId !== organizationId) {
    return { error: "Unauthorized" };
  }

  const isAdmin = canAdministerOrganization(decision, organizationId);
  const isDirector = decision.roles.includes("publicity_director");
  const isPro = decision.roles.includes("pro");

  const canManagePresident = isAdmin;
  const canRevokePresident = isAdmin || isDirector;
  const canManageAvailability = isDirector || isPro;

  const [presidentsResult, unavailableResult, eventsResult] = await Promise.all([
    client
      .from("executive_designations")
      .select(
        "id, membership_id, designation, granted_by_user_id, grant_reason, granted_at, revoked_at, revoked_by_user_id, revocation_reason",
      )
      .eq("designation", "president")
      .is("revoked_at", null),
    client
      .from("junior_officer_unavailability")
      .select(
        "id, membership_id, reason, marked_by_user_id, starts_at, ends_at, revoked_at, revoked_by_user_id, revocation_reason",
      )
      .is("revoked_at", null)
      .lte("starts_at", new Date().toISOString())
      .or("ends_at.is.null,ends_at.gt." + new Date().toISOString()),
    client
      .from("workflow_governance_events")
      .select(
        "id, membership_id, actor_user_id, event_type, reason, created_at",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return {
    canManagePresident,
    canRevokePresident,
    canManageAvailability,
    presidents: presidentsResult.data ?? [],
    unavailable: unavailableResult.data ?? [],
    events: eventsResult.data ?? [],
  };
}