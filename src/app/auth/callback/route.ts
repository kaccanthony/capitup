import { NextResponse, type NextRequest } from "next/server";
import { getAuthorizationForClient } from "@/lib/auth/authorization";
import { safeInternalRedirect } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

function redirect(request: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = safeInternalRedirect(
    request.nextUrl.searchParams.get("next"),
    "/",
  );
  const client = await createServerSupabaseClient();

  if (!client || !code) {
    return redirect(request, "/access-denied");
  }

  const { error } = await client.auth.exchangeCodeForSession(code);

  if (error) {
    return redirect(request, "/access-denied");
  }

  // Attempt the normal claim flow (matches by email in JWT).
  await client.rpc("claim_current_membership");
  let decision = await getAuthorizationForClient(client);

  // Fallback: if claim failed (e.g. Microsoft SSO JWT lacks email claim),
  // use the service-role client to find and activate the pending allowlist
  // entry by the authenticated user's email from auth.getUser().
  if (decision.kind !== "active") {
    const {
      data: { user },
    } = await client.auth.getUser();

    if (user?.email) {
      const serviceClient = createServiceRoleSupabaseClient();
      if (serviceClient) {
        const normalizedEmail = user.email.trim().toLowerCase();

        // Find the pending allowlist entry for this email.
        const { data: allowlistEntry } = await serviceClient
          .from("member_allowlist")
          .select("id")
          .eq("normalized_email", normalizedEmail)
          .eq("status", "pending")
          .maybeSingle();

        if (allowlistEntry?.id) {
          // Find the invited membership linked to this allowlist entry.
          const { data: membership } = await serviceClient
            .from("organization_memberships")
            .select("id")
            .eq("allowlist_entry_id", allowlistEntry.id)
            .eq("status", "invited")
            .maybeSingle();

          if (membership?.id) {
            // Activate both rows directly, bypassing the claim RPC.
            await serviceClient
              .from("member_allowlist")
              .update({
                status: "claimed",
                claimed_by_user_id: user.id,
                claimed_at: new Date().toISOString(),
              })
              .eq("id", allowlistEntry.id);

            await serviceClient
              .from("organization_memberships")
              .update({
                status: "active",
                user_id: user.id,
                normalized_email: normalizedEmail,
                activated_at: new Date().toISOString(),
                status_reason: null,
              })
              .eq("id", membership.id);

            // Re-read authorization after activation.
            decision = await getAuthorizationForClient(client);
          }
        }
      }
    }
  }

  if (decision.kind === "active") {
    return redirect(request, nextPath);
  }

  await client.auth.signOut();
  return redirect(request, "/access-denied?reason=allowlist");
}