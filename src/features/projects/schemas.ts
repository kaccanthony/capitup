import { z } from "zod";
import {
  CONTENT_KINDS,
  CONTROLLED_TAGS,
  tagsMatchContentKind,
} from "@/features/content/taxonomy";

const uuidSchema = z.uuid();
const trimmedText = (minimum: number, maximum: number) =>
  z.string().trim().min(minimum).max(maximum);

export const projectInputSchema = z.object({
  title: trimmedText(1, 160),
  description: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((value) => value || null),
});

export const projectUpdateSchema = projectInputSchema.extend({
  projectId: uuidSchema,
  expectedVersion: z.coerce.number().int().positive(),
});

export const projectAssignmentInputSchema = z.object({
  projectId: uuidSchema,
  membershipId: uuidSchema,
  role: z.enum([
    "publicity_head",
    "co_project_head",
    "project_head",
    "writer",
    "viewer",
  ]),
  startsAt: z.iso.datetime().optional(),
  endsAt: z.iso.datetime().nullable().optional(),
});

export const contentResponsibilityInputSchema = z.object({
  projectId: uuidSchema,
  contentItemId: uuidSchema,
  projectAssignmentId: uuidSchema,
  responsibility: z.enum(["writer", "reviewer"]),
});

const tagSlugSchema = z.enum(
  Object.keys(CONTROLLED_TAGS) as [
    keyof typeof CONTROLLED_TAGS,
    ...(keyof typeof CONTROLLED_TAGS)[],
  ],
);

const contentFields = z
  .object({
    title: trimmedText(1, 200),
    kind: z.enum(CONTENT_KINDS),
    tags: z.array(tagSlugSchema).min(1),
    isSpecialCase: z.boolean(),
    specialCaseReason: z
      .string()
      .trim()
      .max(500)
      .nullish()
      .transform((value) => value || null),
  })
  .superRefine((value, context) => {
    if (!tagsMatchContentKind(value.kind, value.tags)) {
      context.addIssue({
        code: "custom",
        path: ["tags"],
        message:
          "Select at least one controlled tag valid for the content kind.",
      });
    }

    if (value.isSpecialCase !== Boolean(value.specialCaseReason)) {
      context.addIssue({
        code: "custom",
        path: ["specialCaseReason"],
        message:
          "A special-case reason is required only when the indicator is selected.",
      });
    }
  });

export const contentCreateSchema = contentFields.and(
  z.object({ projectId: uuidSchema }),
);

export const contentUpdateSchema = contentFields.and(
  z.object({
    projectId: uuidSchema,
    contentItemId: uuidSchema,
    expectedVersion: z.coerce.number().int().positive(),
  }),
);

export const deliverableInputSchema = z.object({
  projectId: uuidSchema,
  contentItemId: uuidSchema,
  label: trimmedText(1, 120),
  url: z
    .url()
    .max(2048)
    .refine((value) => {
      const parsed = new URL(value);
      return (
        (parsed.protocol === "https:" || parsed.protocol === "http:") &&
        !parsed.username &&
        !parsed.password
      );
    }, "Use an HTTP(S) link without embedded credentials."),
  sourceCommittee: trimmedText(1, 120),
  deliverableType: trimmedText(1, 80),
  status: z
    .string()
    .trim()
    .max(80)
    .nullish()
    .transform((value) => value || null),
});
