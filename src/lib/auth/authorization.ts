import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import {
  classifyMembershipAccess,
  type AuthorizationDecision,
} from "@/lib/auth/policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export async function getAuthorizationForClient(
  client: SupabaseClient<Database>,
): Promise<AuthorizationDecision> {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    return classifyMembershipAccess({
      configured: true,
      userId: null,
      memberships: [],
    });
  }

  const { data: memberships, error: membershipError } = await client.rpc(
    "get_current_membership_access",
  );

  if (membershipError) {
    return { kind: "unauthorized", userId: user.id };
  }

  return classifyMembershipAccess({
    configured: true,
    userId: user.id,
    memberships: memberships ?? [],
  });
}

export async function getCurrentAuthorization(): Promise<AuthorizationDecision> {
  const client = await createServerSupabaseClient();

  if (!client) {
    return { kind: "unconfigured" };
  }

  return getAuthorizationForClient(client);
}

export async function requireActiveMembership() {
  const client = await createServerSupabaseClient();

  if (!client) {
    redirect("/login");
  }

  const decision = await getAuthorizationForClient(client);

  if (decision.kind === "active") {
    return decision;
  }

  if (decision.kind === "unauthenticated") {
    redirect("/login");
  }

  await client.rpc("record_current_access_denied");

  redirect("/access-denied");
}
