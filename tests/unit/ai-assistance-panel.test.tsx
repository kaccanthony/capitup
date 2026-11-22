import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AiAssistancePanel } from "@/features/ai/ai-assistance-panel";

describe("AI assistance panel", () => {
  it("keeps private-caption generation unavailable and manual drafting visible", () => {
    render(<AiAssistancePanel canEdit />);

    expect(
      screen.getByRole("button", { name: /Generate editable draft/ }),
    ).toBeDisabled();
    expect(screen.getByText(/will not be sent to Gemini/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Manual drafting remains available/i),
    ).toBeInTheDocument();
  });
});
