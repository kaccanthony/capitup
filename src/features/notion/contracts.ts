import { z } from "zod";

const notionPropertyIdSchema = z.string().trim().min(1).max(200);

export const notionFieldKeySchema = z.enum([
  "project_title",
  "event_start_at",
  "deadline_at",
  "post_status",
  "assignee_refs",
  "deep_link",
]);

export const notionPostStatusSchema = z.enum([
  "NOT POSTED YET",
  "SCHEDULED",
  "POSTPONED",
  "CANCELLED",
  "NOT NEEDED",
  "POSTED",
]);

export const notionFieldDirectionSchema = z.enum(["import", "export"]);
export const notionPropertyTypeSchema = z.enum([
  "title",
  "date",
  "select",
  "status",
  "people",
  "url",
]);

export const notionFieldMappingSchema = z.object({
  field: notionFieldKeySchema,
  direction: notionFieldDirectionSchema,
  propertyId: notionPropertyIdSchema,
  propertyType: notionPropertyTypeSchema,
});

export const notionFieldMappingsSchema = z.preprocess(
  (input) =>
    Array.isArray(input)
      ? input.flatMap((entry) => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            return [entry];
          }
          const mapping = entry as Record<string, unknown>;
          if (
            mapping.field === "caption_content" ||
            mapping.field === "writer_summary" ||
            mapping.field === "workflow_status"
          ) {
            return [];
          }
          if (mapping.field === "viewer_url") {
            return [{ ...mapping, field: "deep_link" }];
          }
          return [entry];
        })
      : input,
  z
    .array(notionFieldMappingSchema)
    .max(6)
    .superRefine((mappings, context) => {
      const seen = new Set<string>();

      for (const mapping of mappings) {
        if (seen.has(mapping.field)) {
          context.addIssue({
            code: "custom",
            message: "A field may be mapped only once.",
            path: ["field"],
          });
        }
        seen.add(mapping.field);
      }

      const expected: Record<
        z.infer<typeof notionFieldKeySchema>,
        {
          direction: z.infer<typeof notionFieldDirectionSchema>;
          types: string[];
        }
      > = {
        project_title: { direction: "import", types: ["title"] },
        event_start_at: { direction: "import", types: ["date"] },
        deadline_at: { direction: "import", types: ["date"] },
        post_status: { direction: "import", types: ["status"] },
        assignee_refs: { direction: "import", types: ["people"] },
        deep_link: { direction: "export", types: ["url"] },
      };

      for (const mapping of mappings) {
        const rule = expected[mapping.field];
        if (
          mapping.direction !== rule.direction ||
          !rule.types.includes(mapping.propertyType)
        ) {
          context.addIssue({
            code: "custom",
            message:
              "The mapped field has an invalid direction or Notion type.",
            path: ["field"],
          });
        }
      }
    }),
);

export type NotionFieldMapping = z.infer<typeof notionFieldMappingSchema>;
export type NotionFieldMappings = z.infer<typeof notionFieldMappingsSchema>;

const notionIdSchema = z.string().trim().min(1).max(200);

export const notionWebhookEventSchema = z.object({
  id: notionIdSchema,
  timestamp: z.string().datetime({ offset: true }),
  type: z.string().trim().min(1).max(160),
  workspace_id: notionIdSchema,
  subscription_id: notionIdSchema,
  entity: z.object({
    id: notionIdSchema,
    type: z.string().trim().min(1).max(80),
  }),
});

export type NotionWebhookEvent = z.infer<typeof notionWebhookEventSchema>;

export const notionConnectionInputSchema = z.object({
  organizationId: z.string().uuid(),
  label: z.string().trim().min(1).max(120),
  workspaceId: notionIdSchema,
  subscriptionId: notionIdSchema,
  dataSourceId: notionIdSchema,
  mappings: notionFieldMappingsSchema,
});

export type NotionConnectionInput = z.infer<typeof notionConnectionInputSchema>;
