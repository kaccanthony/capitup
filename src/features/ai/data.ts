import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AiStyleProfileOption = {
  id: string;
  name: string;
  scope: string;
  version: number | null;
};

/**
 * RLS already limits the query to the active member's visible profiles. The
 * panel receives profile labels only; rules and samples remain server-only.
 */
export async function listVisibleAiStyleProfiles(): Promise<
  AiStyleProfileOption[]
> {
  const client = await createServerSupabaseClient();
  if (!client) return [];

  const { data: profiles, error: profileError } = await client
    .from("ai_style_profiles")
    .select("id,name,scope,active_version_id")
    .eq("status", "active")
    .order("name");
  if (profileError || !profiles) return [];

  const versionIds = profiles.flatMap((profile) =>
    profile.active_version_id ? [profile.active_version_id] : [],
  );
  if (versionIds.length === 0) {
    return profiles.map((profile) => ({ ...profile, version: null }));
  }

  const { data: versions, error: versionError } = await client
    .from("ai_style_profile_versions")
    .select("id,version_number")
    .in("id", versionIds);
  if (versionError) return [];

  const versionById = new Map(
    (versions ?? []).map((version) => [version.id, version.version_number]),
  );
  return profiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    scope: profile.scope,
    version: profile.active_version_id
      ? (versionById.get(profile.active_version_id) ?? null)
      : null,
  }));
}
