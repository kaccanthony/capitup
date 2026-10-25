import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TaxonomyOption } from "@/features/content/taxonomy";
import { ContentForm } from "@/features/projects/content-form";

const taxonomy: TaxonomyOption[] = [
  {
    kind: "post",
    label: "Post",
    tags: [
      { slug: "GENERAL", label: "General", emoji: "📄" },
      { slug: "BIRTHDAY", label: "Birthday", emoji: "🎂" },
    ],
  },
  {
    kind: "video",
    label: "Video",
    tags: [{ slug: "REEL", label: "Reel", emoji: "🎥" }],
  },
  {
    kind: "article",
    label: "Article",
    tags: [{ slug: "STORY", label: "Story", emoji: "🖼️" }],
  },
];

describe("Phase 03 content form", () => {
  it("shows only controlled tags for the selected content kind", () => {
    render(
      <ContentForm
        action={vi.fn()}
        projectId="11111111-1111-4111-8111-111111111111"
        taxonomy={taxonomy}
        submitLabel="Create content record"
      />,
    );

    expect(screen.getByRole("checkbox", { name: /General/ })).toBeVisible();
    expect(screen.queryByRole("checkbox", { name: /Reel/ })).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: "Video" }));

    expect(screen.getByRole("checkbox", { name: /Reel/ })).toBeVisible();
    expect(screen.queryByRole("checkbox", { name: /Birthday/ })).toBeNull();
  });

  it("describes the special-case indicator as non-approving", () => {
    render(
      <ContentForm
        action={vi.fn()}
        projectId="11111111-1111-4111-8111-111111111111"
        taxonomy={taxonomy}
        submitLabel="Create content record"
      />,
    );

    expect(
      screen.getByText(/does not approve a length exception/i),
    ).toBeVisible();
    expect(screen.queryByRole("textbox", { name: /caption body/i })).toBeNull();
  });
});
