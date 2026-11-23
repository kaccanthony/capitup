import { z } from "zod";
import { parseEnvironment, type EnvironmentInput } from "@/lib/env/shared";

const configuredText = z.string().trim().min(1).optional();

export const serverEnvironmentSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: configuredText,
  LIVEBLOCKS_SECRET_KEY: configuredText,
  GEMINI_API_KEY: configuredText,
  APP_ENCRYPTION_KEY: configuredText,
});

export type ServerEnvironment = z.output<typeof serverEnvironmentSchema>;

export function parseServerEnvironment(
  input: EnvironmentInput,
): ServerEnvironment {
  return parseEnvironment(serverEnvironmentSchema, input);
}
