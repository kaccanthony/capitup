import "server-only";

import { Client, isNotionClientError } from "@notionhq/client";
import { z } from "zod";
import type { NotionPageForMapping } from "@/features/notion/mapper";
import { getServerEnvironment } from "@/lib/env/server";

export class NotionUnavailableError extends Error {
  constructor() {
    super("The Notion integration is unavailable.");
    this.name = "NotionUnavailableError";
  }
}

const notionPropertySchema = z.object({
  type: z.string().optional(),
  title: z.unknown().optional(),
  rich_text: z.array(z.object({ plain_text: z.string() })).optional(),
  date: z.unknown().optional(),
  select: z.unknown().optional(),
  status: z.unknown().optional(),
  url: z.string().optional(),
}).passthrough();

const pageSchema = z.object({
  id: z.string().trim().min(1),
  last_edited_time: z.string().datetime({ offset: true }),
  properties: z.record(z.string(), notionPropertySchema),
});

export function createNotionClient() {
  const token = getServerEnvironment().NOTION_API_TOKEN;
  if (!token) throw new NotionUnavailableError();
  return new Client({ auth: token });
}

export async function verifyNotionDataSourceAccess(input: {
  dataSourceId: string;
}) {
  try {
    const client = createNotionClient();
    const [bot, dataSource] = await Promise.all([
      client.users.me({}),
      client.dataSources.retrieve({ data_source_id: input.dataSourceId }),
    ]);

    return { botId: bot.id, dataSourceId: dataSource.id };
  } catch {
    throw new NotionUnavailableError();
  }
}

export async function fetchNotionPage(
  pageId: string,
): Promise<NotionPageForMapping> {
  try {
    const page = await createNotionClient().pages.retrieve({ page_id: pageId });
    const parsed = pageSchema.safeParse(page);
    if (!parsed.success) throw new NotionUnavailableError();

    return {
      id: parsed.data.id,
      lastEditedAt: parsed.data.last_edited_time,
      properties: parsed.data.properties,
    };
  } catch (error) {
    if (error instanceof NotionUnavailableError) throw error;
    if (isNotionClientError(error)) throw error;
    throw new NotionUnavailableError();
  }
}

export function notionErrorStatusCode(error: unknown) {
  if (
    isNotionClientError(error) &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }
  return undefined;
}
