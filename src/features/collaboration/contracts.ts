import { z } from "zod";
import type { Json } from "@/types/database";

export type CollaborationEditorNode = {
  type: string;
  text?: string;
  attrs?: { [key: string]: Json | undefined };
  marks?: CollaborationEditorMark[];
  content?: CollaborationEditorNode[];
};

export type CollaborationEditorMark = {
  type: string;
  attrs?: { [key: string]: Json | undefined };
};

const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(z.string(), jsonSchema),
  ]),
);

export const collaborationEditorNodeSchema: z.ZodType<CollaborationEditorNode> =
  z.lazy(() =>
    z.object({
      type: z.string().min(1),
      text: z.string().optional(),
      attrs: z.record(z.string(), jsonSchema).optional(),
      marks: z
        .array(
          z.object({
            type: z.string().min(1),
            attrs: z.record(z.string(), jsonSchema).optional(),
          }),
        )
        .optional(),
      content: z.array(collaborationEditorNodeSchema).optional(),
    }),
  );

export const collaborationAnchorSchema = z.object({
  from: z.number().int().nonnegative(),
  to: z.number().int().nonnegative(),
  quote: z.string().max(10_000),
  fromRelative: z.string().max(4096).optional(),
  toRelative: z.string().max(4096).optional(),
});

export const collaborationMentionIdsSchema = z
  .array(z.string().uuid())
  .max(50)
  .default([]);

export const createThreadSchema = z.object({
  projectId: z.string().uuid(),
  contentItemId: z.string().uuid(),
  anchor: collaborationAnchorSchema.refine(
    (anchor) => anchor.to >= anchor.from,
    "Invalid text anchor.",
  ),
  body: z.string().trim().min(1).max(5000),
  mentionedUserIds: collaborationMentionIdsSchema,
});

export const replyThreadSchema = z.object({
  projectId: z.string().uuid(),
  contentItemId: z.string().uuid(),
  threadId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
  mentionedUserIds: collaborationMentionIdsSchema,
});

export const resolveThreadSchema = z.object({
  projectId: z.string().uuid(),
  contentItemId: z.string().uuid(),
  threadId: z.string().uuid(),
  resolved: z.boolean(),
});

export const createSuggestionSchema = z
  .object({
    projectId: z.string().uuid(),
    contentItemId: z.string().uuid(),
    kind: z.enum(["insert", "delete", "replace"]),
    anchor: collaborationAnchorSchema.refine(
      (anchor) => anchor.to >= anchor.from,
      "Invalid text anchor.",
    ),
    sourceText: z.string().max(10_000),
    replacementText: z.string().max(10_000),
  })
  .superRefine((value, context) => {
    const valid =
      (value.kind === "insert" &&
        value.sourceText === "" &&
        value.replacementText !== "") ||
      (value.kind === "delete" &&
        value.sourceText !== "" &&
        value.replacementText === "") ||
      (value.kind === "replace" &&
        value.sourceText !== "" &&
        value.replacementText !== "");

    if (!valid) {
      context.addIssue({ code: "custom", message: "Invalid suggestion." });
    }
  });

export const decideSuggestionSchema = z.object({
  projectId: z.string().uuid(),
  contentItemId: z.string().uuid(),
  suggestionId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  action: z.enum(["accept", "reject"]),
  reason: z.string().trim().max(2000).nullable(),
});

export const applySuggestionSchema = z.object({
  projectId: z.string().uuid(),
  contentItemId: z.string().uuid(),
  suggestionId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
});

export const setCaptionReactionSchema = z
  .object({
    projectId: z.string().uuid(),
    contentItemId: z.string().uuid(),
    captionVersionId: z.string().uuid(),
    kind: z.enum(["looks_ready", "needs_refinement"]).nullable(),
    comment: z.string().trim().max(1000).nullable(),
  })
  .superRefine((value, context) => {
    if (
      value.kind === "needs_refinement" &&
      (!value.comment || value.comment.length === 0)
    ) {
      context.addIssue({
        code: "custom",
        path: ["comment"],
        message: "Needs refinement requires a comment.",
      });
    }
  });

export const markNotificationReadSchema = z.object({
  projectId: z.string().uuid(),
  contentItemId: z.string().uuid(),
  notificationId: z.string().uuid(),
});

export const collaborationSnapshotRequestSchema = z.object({
  templateId: z.string().uuid(),
});
