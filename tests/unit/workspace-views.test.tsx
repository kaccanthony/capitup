import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DashboardShell,
  type WorkspaceView,
} from "@/features/dashboard/dashboard-shell";

describe("Phase 01 route-level workspace previews", () => {
  it.each([
    ["Captions", "captions"],
    ["Projects", "projects"],
    ["Calendar", "calendar"],
    ["Archive", "archive"],
  ] as const)("renders the %s workspace preview", (title, view) => {
    render(<DashboardShell view={view as WorkspaceView} />);

    expect(
      screen.getByRole("heading", { level: 1, name: title }),
    ).toBeVisible();
    expect(
      within(
        screen.getByRole("navigation", { name: "Primary navigation" }),
      ).getByRole("link", { name: new RegExp(`^${title}`) }),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByText(/Preview workspace/)).toBeVisible();
  });
});
