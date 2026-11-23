import { describe, expect, it, vi } from "vitest";
import { findCaptionEmbedBlockId, syncCaptionEmbed, CaptionEmbedLookupError } from "@/features/notion/caption-embed";

const caption = { id: "label", type: "paragraph", paragraph: { rich_text: [{ plain_text: "Caption", annotations: { bold: true } }] } };
const embed = { id: "caption-embed", type: "embed", embed: { url: "" } };

describe("Notion Caption embed sync", () => {
  it("updates only the unique embed immediately after the bold Caption label", async () => {
    const updateEmbed = vi.fn();
    await syncCaptionEmbed({ pageId: "page", url: "https://capitup.test/open", listChildren: async () => ({ results: [caption, embed], has_more: false, next_cursor: null }), updateEmbed });
    expect(updateEmbed).toHaveBeenCalledWith("caption-embed", "https://capitup.test/open");
  });
  it("fails safely for missing and ambiguous templates", () => {
    expect(() => findCaptionEmbedBlockId([])).toThrowError(CaptionEmbedLookupError);
    expect(() => findCaptionEmbedBlockId([caption, embed, caption, { ...embed, id: "other" }])).toThrowError(CaptionEmbedLookupError);
  });
  it("traverses pagination", async () => {
    const listChildren = vi.fn().mockResolvedValueOnce({ results: [caption], has_more: true, next_cursor: "next" }).mockResolvedValueOnce({ results: [embed], has_more: false, next_cursor: null });
    const updateEmbed = vi.fn();
    await syncCaptionEmbed({ pageId: "page", url: "https://capitup.test/open", listChildren, updateEmbed });
    expect(listChildren).toHaveBeenNthCalledWith(2, "page", "next");
    expect(updateEmbed).toHaveBeenCalledTimes(1);
  });
  it("propagates provider update failures for retry", async () => {
    await expect(syncCaptionEmbed({ pageId: "page", url: "https://capitup.test/open", listChildren: async () => ({ results: [caption, embed], has_more: false, next_cursor: null }), updateEmbed: async () => { throw new Error("Notion rejected update"); } })).rejects.toThrow("Notion rejected update");
  });
});
