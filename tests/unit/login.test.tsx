import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginShell } from "@/features/auth/login-shell";

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: ({
    onSuccess,
    onExpire,
  }: {
    onSuccess: (token: string) => void;
    onExpire: () => void;
  }) => (
    <div>
      <button type="button" onClick={() => onSuccess("test-token")}>
        Solve challenge
      </button>
      <button type="button" onClick={onExpire}>
        Expire challenge
      </button>
    </div>
  ),
}));

vi.mock("@/features/auth/actions", () => ({
  signInWithPassword: vi.fn(),
  startOAuthSignIn: vi.fn(),
}));

describe("Phase 02 login shell", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("offers OAuth first and keeps password behind a disclosure", () => {
    render(<LoginShell />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome back." }),
    ).toBeInTheDocument();
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
    ).toBeDisabled();
    expect(
      screen.getByText(
        "Access requires an active invitation and organization membership.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/create account/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/magic link/i)).not.toBeInTheDocument();
  });

  it("requires a live Turnstile token for password sign-in", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "test-site-key");
    render(<LoginShell />);

    const submit = screen.getByRole("button", {
      name: "Sign in with email",
      hidden: true,
    });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Solve challenge" }));
    expect(submit).toBeEnabled();
    expect(document.querySelector('input[name="captchaToken"]')).toHaveValue(
      "test-token",
    );
    fireEvent.click(screen.getByRole("button", { name: "Expire challenge" }));
    expect(submit).toBeDisabled();
    expect(screen.getByRole("alert", { hidden: true })).toHaveTextContent(
      "Verification expired. Complete the check again.",
    );
  });
});
