import { getServerEnvironment } from "@/lib/env/server";
import { timingSafeEqual } from "node:crypto";
import { acceptVerifiedNotionWebhook, sha256 } from "@/features/notion/data";
import { synchronizeNotionWebhookImport } from "@/features/notion/sync";
import { verifyNotionWebhook } from "@/features/notion/webhook";

export const runtime = "nodejs";

const unavailable = () =>
  Response.json({ error: "Integration unavailable." }, { status: 503 });

export async function POST(request: Request) {
  const environment = getServerEnvironment();
  if (!environment.NOTION_WEBHOOK_SECRET) return unavailable();

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength > 1_000_000) {
    return Response.json({ error: "Invalid webhook." }, { status: 400 });
  }

  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) {
    return Response.json({ error: "Invalid webhook." }, { status: 400 });
  }

  // Notion's initial subscription verification has no event signature.
  let verification: unknown;
  try {
    verification = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid webhook." }, { status: 400 });
  }
  if (
    verification !== null &&
    typeof verification === "object" &&
    "verification_token" in verification &&
    Object.keys(verification).length === 1
  ) {
    const candidate = verification.verification_token;
    const expected = Buffer.from(environment.NOTION_WEBHOOK_SECRET);
    const received =
      typeof candidate === "string" ? Buffer.from(candidate) : null;
    if (
      !received ||
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      return Response.json({ error: "Invalid webhook." }, { status: 401 });
    }
    return Response.json({ received: true }, { status: 200 });
  }

  const verified = await verifyNotionWebhook({
    rawBody,
    signature: request.headers.get("x-notion-signature"),
    verificationToken: environment.NOTION_WEBHOOK_SECRET,
  });
  if (!verified.ok) {
    return Response.json({ error: "Invalid webhook." }, { status: 401 });
  }

  try {
    const accepted = await acceptVerifiedNotionWebhook({
      event: verified.event,
      payloadHash: sha256(rawBody),
    });
    if (!accepted.is_duplicate) {
      try {
        await synchronizeNotionWebhookImport(accepted.webhook_event_id);
      } catch {
        // The received event and retry state are durable. Provider outages do
        // not affect caption requests and are surfaced to administrators.
      }
    }
  } catch {
    return unavailable();
  }

  return Response.json({ received: true }, { status: 202 });
}
