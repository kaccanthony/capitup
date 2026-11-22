import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getServerEnvironment } from "@/lib/env/server";
import { getSupabasePublicConfiguration } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

/**
 * Creates a non-persistent privileged client for narrowly scoped server work.
 * Callers must authenticate and authorize with the normal SSR client first.
 */
export function createServiceRoleSupabaseClient() {
  const configuration = getSupabasePublicConfiguration();
  const serviceRoleKey = getServerEnvironment().SUPABASE_SERVICE_ROLE_KEY;

  if (!configuration || !serviceRoleKey) {
    return null;
  }

  return createClient<Database>(configuration.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
