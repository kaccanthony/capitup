import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginShell } from "@/features/auth/login-shell";

vi.mock("@/features/auth/actions", () => ({
  requestSignInLink: vi.fn(),
}));

describe("Phase 02 login shell", () => {
  it("renders an invitation-only institutional sign-in form", () => {
    render(<LoginShell />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome back." }),
    ).toBeVisible();
    expect(screen.getByText("Authorized members only")).toBeVisible();
    expect(screen.getByLabelText("Institutional email")).toHaveAttribute(
      "type",
      "email",
    );
    expect(
      screen.getByRole("button", { name: "Send secure sign-in link" }),
    ).toBeEnabled();
    expect(
      screen.getByText(
        "Access requires an active invitation and organization membership.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/create account/i)).not.toBeInTheDocument();
  });
});
