import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

describe("Phase 01 foundation shell", () => {
  it("renders the CapItUp dashboard preview with semantic regions", () => {
    render(<DashboardShell />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Good morning, team." }),
    ).toBeVisible();
    expect(screen.getByRole("main")).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "Primary navigation" }),
    ).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "Mobile navigation" }),
    ).toBeVisible();
    expect(
      screen.getByRole("complementary", { name: "Draft assistant" }),
    ).toBeVisible();
    expect(screen.getByText("Preview workspace · sample data")).toBeVisible();
    expect(screen.getByRole("button", { name: "New caption" })).toBeDisabled();
    expect(
      screen.getByRole("link", { name: "Skip to workspace" }),
    ).toHaveAttribute("href", "#main-content");
    expect(
      screen.getAllByRole("link", { name: "Captions" })[0],
    ).toHaveAttribute("href", "/captions");
    expect(
      screen.getAllByRole("link", { name: "Calendar" })[0],
    ).toHaveAttribute("href", "/calendar");
  });
});
