import { getPublicEnvironment } from "@/lib/env/client";

export type SupabasePublicConfiguration = {
  url: string;
  publishableKey: string;
};

export function getSupabasePublicConfiguration(): SupabasePublicConfiguration | null {
  const environment = getPublicEnvironment();
  const publishableKey =
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!environment.NEXT_PUBLIC_SUPABASE_URL || !publishableKey) {
    return null;
  }

  return {
    url: environment.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey,
  };
}
