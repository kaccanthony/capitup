import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("Phase 0 foundation page", () => {
  it("identifies the CapItUp repository foundation", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "CapItUp" }),
    ).toBeVisible();
    expect(screen.getByText("Repository foundation is ready.")).toBeVisible();
  });
});
