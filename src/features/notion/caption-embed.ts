export type NotionBlock = {
  id: string;
  type: string;
  [key: string]: unknown;
};

export class CaptionEmbedLookupError extends Error {
  constructor(readonly reason: "missing" | "ambiguous" | "invalid") {
    super("Caption embed could not be located safely.");
  }
}

function isCaptionLabel(block: NotionBlock) {
  if (!["paragraph", "heading_1", "heading_2", "heading_3"].includes(block.type)) return false;
  const value = block[block.type];
  if (typeof value !== "object" || value === null || !("rich_text" in value) || !Array.isArray(value.rich_text)) return false;
  const text = value.rich_text.map((part) => {
    if (typeof part !== "object" || part === null) return null;
    return part as { plain_text?: unknown; annotations?: { bold?: unknown } };
  });
  return text.length > 0 && text.map((part) => typeof part?.plain_text === "string" ? part.plain_text : "").join("").trim() === "Caption" && text.some((part) => part?.annotations?.bold === true);
}

export function findCaptionEmbedBlockId(blocks: NotionBlock[]) {
  const matches: string[] = [];
  for (let i = 0; i < blocks.length; i += 1) {
    if (!isCaptionLabel(blocks[i])) continue;
    const next = blocks[i + 1];
    if (next?.type === "embed" && next.id) matches.push(next.id);
  }
  if (matches.length === 0) throw new CaptionEmbedLookupError("missing");
  if (matches.length !== 1) throw new CaptionEmbedLookupError("ambiguous");
  return matches[0];
}

export async function syncCaptionEmbed(input: {
  pageId: string;
  url: string;
  listChildren: (blockId: string, cursor?: string) => Promise<{ results: NotionBlock[]; has_more: boolean; next_cursor: string | null }>;
  updateEmbed: (blockId: string, url: string) => Promise<unknown>;
}) {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;
  do {
    const page = await input.listChildren(input.pageId, cursor);
    blocks.push(...page.results);
    cursor = page.has_more ? page.next_cursor ?? undefined : undefined;
    if (page.has_more && !cursor) throw new CaptionEmbedLookupError("invalid");
  } while (cursor);

  const blockId = findCaptionEmbedBlockId(blocks);
  await input.updateEmbed(blockId, input.url);
}
