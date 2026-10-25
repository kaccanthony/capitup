"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfiguration } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

export function createBrowserSupabaseClient() {
  const configuration = getSupabasePublicConfiguration();

  if (!configuration) {
    throw new Error("Supabase authentication is not configured.");
  }

  return createBrowserClient<Database>(
    configuration.url,
    configuration.publishableKey,
  );
}
