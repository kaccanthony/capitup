export const CONTENT_KINDS = ["post", "video", "article"] as const;

export type ContentKind = (typeof CONTENT_KINDS)[number];

export const CONTROLLED_TAGS = {
  GENERAL: { label: "General", emoji: "📄" },
  BIRTHDAY: { label: "Birthday", emoji: "🎂" },
  ANNOUNCEMENT: { label: "Announcement", emoji: "📢" },
  EVENT: { label: "Event", emoji: "📰" },
  BRANDING: { label: "Branding", emoji: "🗞️" },
  STORY: { label: "Story", emoji: "🖼️" },
  HN: { label: "HN", emoji: "‼️" },
  HOLIDAY: { label: "Holiday", emoji: "🗓️" },
  VIDEO: { label: "Video", emoji: "📽️" },
  AVP: { label: "AVP", emoji: "🎥" },
  REEL: { label: "Reel", emoji: "🎥" },
} as const;

export type ControlledTagSlug = keyof typeof CONTROLLED_TAGS;

export type TaxonomyOption = {
  kind: ContentKind;
  label: string;
  tags: {
    slug: ControlledTagSlug;
    label: string;
    emoji: string;
  }[];
};

export const TAGS_BY_KIND: Record<ContentKind, readonly ControlledTagSlug[]> = {
  article: ["GENERAL", "ANNOUNCEMENT", "EVENT", "STORY"],
  video: ["VIDEO", "AVP", "REEL"],
  post: [
    "GENERAL",
    "BIRTHDAY",
    "ANNOUNCEMENT",
    "EVENT",
    "BRANDING",
    "STORY",
    "HN",
    "HOLIDAY",
  ],
};

export function tagsMatchContentKind(
  kind: ContentKind,
  tags: readonly ControlledTagSlug[],
) {
  const allowed = new Set(TAGS_BY_KIND[kind]);
  return (
    tags.length > 0 &&
    new Set(tags).size === tags.length &&
    tags.every((tag) => allowed.has(tag))
  );
}
