"use server";

import { redirect } from "next/navigation";
import { signInRequestSchema } from "@/lib/auth/schemas";
import { safeInternalRedirect } from "@/lib/auth/redirects";
import { getPublicEnvironment } from "@/lib/env/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SignInFormState = {
  status: "idle" | "invalid" | "submitted" | "unavailable";
};

export async function requestSignInLink(
  _previousState: SignInFormState,
  formData: FormData,
): Promise<SignInFormState> {
  const parsed = signInRequestSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") || undefined,
    captchaToken: formData.get("captchaToken") || undefined,
  });

  if (!parsed.success) {
    return { status: "invalid" };
  }

  const client = await createServerSupabaseClient();
  const appUrl = getPublicEnvironment().NEXT_PUBLIC_APP_URL;

  if (!client || !appUrl) {
    return { status: "unavailable" };
  }

  const nextPath = safeInternalRedirect(parsed.data.next, "/");
  const callbackUrl = new URL("/auth/callback", appUrl);
  callbackUrl.searchParams.set("next", nextPath);

  await client.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: callbackUrl.toString(),
      captchaToken: parsed.data.captchaToken,
    },
  });

  // The same response is returned for invited, unknown, disabled, and
  // provider-rejected identities to avoid membership enumeration.
  return { status: "submitted" };
}

export async function logoutAction() {
  const client = await createServerSupabaseClient();

  if (client) {
    await client.rpc("record_current_sign_out");
    await client.auth.signOut();
  }

  redirect("/login");
}
