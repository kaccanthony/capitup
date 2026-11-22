import { z } from "zod";

export const aiActionSchema = z.enum([
  "generate_three_directions",
  "adjust_length",
  "naturalize",
  "match_style",
  "platform_variants",
  "grammar_and_clarity",
  "suggest_elements",
  "check_publicity_checklist",
]);

export const confirmedAiBriefSchema = z.object({
  action: aiActionSchema,
  brief: z.string().trim().min(1).max(10_000),
  confirmedAt: z.string().datetime({ offset: true }),
});

export const aiGenerationRequestSchema = confirmedAiBriefSchema.extend({
  projectId: z.string().uuid(),
  contentItemId: z.string().uuid(),
  styleProfileId: z.string().uuid().optional(),
});

export const aiCaptionVariantSchema = z.object({
  tone: z.string().trim().min(1),
  hook: z.string().trim().min(1),
  body: z.string().trim().min(1),
  cta: z.string().trim().min(1),
  hashtags: z.array(z.string().trim().min(1)).max(30),
  assumptions: z.array(z.string().trim().min(1)).max(30),
  warnings: z.array(z.string().trim().min(1)).max(30),
});

export const aiGenerationOutputSchema = z.object({
  variants: z.array(aiCaptionVariantSchema).min(1).max(3),
});

export type AiAction = z.infer<typeof aiActionSchema>;
export type ConfirmedAiBrief = z.infer<typeof confirmedAiBriefSchema>;
export type AiGenerationRequest = z.infer<typeof aiGenerationRequestSchema>;
export type AiCaptionVariant = z.infer<typeof aiCaptionVariantSchema>;
export type AiGenerationOutput = z.infer<typeof aiGenerationOutputSchema>;

export class AiOutputValidationError extends Error {
  constructor() {
    super("AI assistance is unavailable.");
    this.name = "AiOutputValidationError";
  }
}

/**
 * Model output is untrusted. Keep malformed data out of drafts and persistence.
 */
export function parseAiGenerationOutput(
  action: AiAction,
  output: unknown,
): AiGenerationOutput {
  const parsed = aiGenerationOutputSchema.safeParse(output);

  if (
    !parsed.success ||
    (action === "generate_three_directions" &&
      parsed.data.variants.length !== 3)
  ) {
    throw new AiOutputValidationError();
  }

  return parsed.data;
}
