import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfiguration } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

export async function createServerSupabaseClient() {
  const configuration = getSupabasePublicConfiguration();

  if (!configuration) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    configuration.url,
    configuration.publishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot write cookies. src/proxy.ts refreshes
            // sessions and applies cookie updates before rendering.
          }
        },
      },
    },
  );
}
