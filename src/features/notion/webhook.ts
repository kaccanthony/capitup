import "server-only";

import { verifyWebhookSignature } from "@notionhq/client";
import {
  notionWebhookEventSchema,
  type NotionWebhookEvent,
} from "@/features/notion/contracts";

export type VerifiedNotionWebhook =
  | { ok: true; event: NotionWebhookEvent }
  | {
      ok: false;
      reason: "invalid_signature" | "invalid_payload" | "stale_event";
    };

/** Notion's signed payload timestamp is the replay-freshness authority. */
export async function verifyNotionWebhook(input: {
  rawBody: string;
  signature: string | null;
  verificationToken: string;
  now?: Date;
  maximumAgeMs?: number;
}): Promise<VerifiedNotionWebhook> {
  const validSignature = await verifyWebhookSignature({
    body: input.rawBody,
    signature: input.signature,
    verificationToken: input.verificationToken,
  });

  if (!validSignature) return { ok: false, reason: "invalid_signature" };

  let payload: unknown;
  try {
    payload = JSON.parse(input.rawBody);
  } catch {
    return { ok: false, reason: "invalid_payload" };
  }

  const parsed = notionWebhookEventSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, reason: "invalid_payload" };

  const now = input.now ?? new Date();
  const age = now.getTime() - new Date(parsed.data.timestamp).getTime();
  const maximumAgeMs = input.maximumAgeMs ?? 5 * 60 * 1000;

  if (age > maximumAgeMs || age < -60 * 1000) {
    return { ok: false, reason: "stale_event" };
  }

  return { ok: true, event: parsed.data };
}
