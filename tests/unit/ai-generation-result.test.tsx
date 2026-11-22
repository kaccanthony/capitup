import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AiGenerationResult } from "@/features/ai/ai-generation-result";

describe("AI generation result", () => {
  it("discloses influence and offers only editable insertion choices", () => {
    const onInsertDraft = vi.fn();
    const onInsertSuggestion = vi.fn();
    render(
      <AiGenerationResult
        output={{
          variants: [
            {
              tone: "welcoming",
              hook: "Synthetic open day",
              body: "Test body",
              cta: "Register",
              hashtags: ["#Synthetic"],
              assumptions: ["Date confirmed"],
              warnings: ["Verify venue"],
            },
          ],
        }}
        styleProfileName="Synthetic style"
        influencingExampleIds={["sample-1"]}
        onInsertDraft={onInsertDraft}
        onInsertSuggestion={onInsertSuggestion}
      />,
    );

    expect(screen.getByText(/Profile: Synthetic style/)).toBeInTheDocument();
    expect(screen.getByText(/Warnings: Verify venue/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /approve|publish|submit/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Insert as editable draft" }),
    );
    expect(onInsertDraft).toHaveBeenCalledWith(
      "Synthetic open day\n\nTest body\n\nRegister\n\n#Synthetic",
    );
  });
});
