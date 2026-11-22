import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginShell } from "@/features/auth/login-shell";

vi.mock("@/features/auth/actions", () => ({
  signInWithPassword: vi.fn(),
  startOAuthSignIn: vi.fn(),
}));

describe("Phase 02 login shell", () => {
  it("offers OAuth first and keeps password behind a disclosure", () => {
    render(<LoginShell />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome back." }),
    ).toBeVisible();
    expect(screen.getByText("Authorized members only")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: /Microsoft/i }),
    ).not.toBeInTheDocument();
    expect(
      screen
        .getByRole("button", { name: "Continue with Google" })
        .querySelector("svg"),
    ).toBeInTheDocument();
    expect(screen.getByText("Use email instead")).toBeVisible();
    expect(screen.getByLabelText("Institutional email")).toHaveAttribute(
      "type",
      "email",
    );
    expect(
      screen.getByRole("button", { name: "Sign in with email", hidden: true }),
    ).toBeEnabled();
    expect(
      screen.getByText(
        "Access requires an active invitation and organization membership.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/create account/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/magic link/i)).not.toBeInTheDocument();
  });
});
