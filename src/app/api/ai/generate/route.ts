import { aiGenerationRequestSchema } from "@/features/ai/contracts";
import { getAccessibleContentItem } from "@/features/projects/data";

export const runtime = "nodejs";

const unavailableResponse = () =>
  Response.json({ error: "AI assistance is unavailable." }, { status: 503 });

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid AI request." }, { status: 400 });
  }

  const parsed = aiGenerationRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid AI request." }, { status: 400 });
  }

  try {
    const item = await getAccessibleContentItem(
      parsed.data.projectId,
      parsed.data.contentItemId,
    );

    if (!item || !item.canEdit) {
      return Response.json(
        { error: "AI assistance is unavailable." },
        { status: 403 },
      );
    }
  } catch {
    return Response.json(
      { error: "AI assistance is unavailable." },
      { status: 403 },
    );
  }

  // Gemini Free is synthetic-development-only. Do not invoke a provider with
  // a user-supplied caption brief until a privacy-approved provider is chosen.
  return unavailableResponse();
}
