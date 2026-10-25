import { NextResponse, type NextRequest } from "next/server";
import { getAuthorizationForClient } from "@/lib/auth/authorization";
import { safeInternalRedirect } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  // Existing active members will have no pending invitation. The claim RPC is
  // therefore attempted idempotently and the resulting access state is always
  // re-read before a private route is entered.
  await client.rpc("claim_current_membership");
  const decision = await getAuthorizationForClient(client);

  if (decision.kind === "active") {
    return redirect(request, nextPath);
  }

  await client.auth.signOut();
  return redirect(request, "/access-denied");
}
