import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CopyCaptionButton } from "@/features/projects/copy-caption-button";

describe("CopyCaptionButton", () => {
  it("copies the authorized caption text on explicit request", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<CopyCaptionButton caption="Approved caption" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy Caption" }));

    expect(writeText).toHaveBeenCalledWith("Approved caption");
    expect(
      await screen.findByRole("button", { name: "Copied" }),
    ).toBeInTheDocument();
  });
});
