import { z } from "zod";

const configuredText = z.string().trim().min(1).optional();
const configuredUrl = z.string().trim().url().optional();

export const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_APP_URL: configuredUrl,
  NEXT_PUBLIC_SUPABASE_URL: configuredUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: configuredText,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: configuredText,
});

export type PublicEnvironment = z.output<typeof publicEnvironmentSchema>;
export type EnvironmentInput = Record<string, string | undefined>;

export class EnvironmentValidationError extends Error {
  readonly keys: readonly string[];

  constructor(keys: readonly string[]) {
    super(
      `Invalid environment variable${keys.length === 1 ? "" : "s"}: ${keys.join(", ")}`,
    );
    this.name = "EnvironmentValidationError";
    this.keys = keys;
  }
}

export function parseEnvironment<TSchema extends z.ZodType>(
  schema: TSchema,
  input: EnvironmentInput,
): z.output<TSchema> {
  const result = schema.safeParse(input);

  if (result.success) {
    return result.data;
  }

  const keys = [
    ...new Set(
      result.error.issues.map((issue) => issue.path.join(".") || "environment"),
    ),
  ];

  throw new EnvironmentValidationError(keys);
}

export function parsePublicEnvironment(
  input: EnvironmentInput,
): PublicEnvironment {
  return parseEnvironment(publicEnvironmentSchema, input);
}
