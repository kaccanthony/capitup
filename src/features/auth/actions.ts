"use server";

import { redirect } from "next/navigation";
import { getAuthorizationForClient } from "@/lib/auth/authorization";
import { signInRequestSchema } from "@/lib/auth/schemas";
import { safeInternalRedirect } from "@/lib/auth/redirects";
import { getPublicEnvironment } from "@/lib/env/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SignInFormState = {
  status: "idle" | "invalid" | "captcha" | "denied" | "unavailable";
};

export async function signInWithPassword(
  _previousState: SignInFormState,
  formData: FormData,
): Promise<SignInFormState> {
  const parsed = signInRequestSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    captchaToken: formData.get("captchaToken"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return { status: formData.get("captchaToken") ? "invalid" : "captcha" };
  }

  const client = await createServerSupabaseClient();
  if (!client) {
    return { status: "unavailable" };
  }

  const nextPath = safeInternalRedirect(parsed.data.next, "/");
  const { error } = await client.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { captchaToken: parsed.data.captchaToken },
  });
  if (error) return { status: "invalid" };

  await client.rpc("claim_current_membership");
  const decision = await getAuthorizationForClient(client);
  if (decision.kind !== "active") {
    await client.auth.signOut();
    return { status: "denied" };
  }
  redirect(nextPath);
}

export async function startOAuthSignIn(formData: FormData) {
  const client = await createServerSupabaseClient();
  const appUrl = getPublicEnvironment().NEXT_PUBLIC_APP_URL;
  if (!client || !appUrl) redirect("/login?status=unavailable");

  const nextPath = safeInternalRedirect(formData.get("next")?.toString(), "/");
  const callbackUrl = new URL("/auth/callback", appUrl);
  callbackUrl.searchParams.set("next", nextPath);
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });
  if (error || !data.url) redirect("/login?status=unavailable");
  redirect(data.url);
}

export async function logoutAction() {
  const client = await createServerSupabaseClient();

  if (client) {
    await client.rpc("record_current_sign_out");
    await client.auth.signOut();
  }

  redirect("/login");
}
