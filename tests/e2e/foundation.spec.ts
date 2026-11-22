import { expect, test } from "@playwright/test";

test("redirects an unauthenticated visitor to sign in", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login\?next=%2F$/);
  await expect(page).toHaveTitle("Sign in · CapItUp");
  await expect(
    page.getByRole("heading", { level: 1, name: "Welcome back." }),
  ).toBeVisible();
});

test("protects every Phase 01 workspace route", async ({ page }) => {
  for (const route of ["/captions", "/projects", "/calendar", "/archive"]) {
    await page.goto(route);
    await expect(page).toHaveURL(
      new RegExp(`/login\\?next=${encodeURIComponent(route)}$`),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Welcome back." }),
    ).toBeVisible();
  }
});

test("protects the Notion integration administration route", async ({
  page,
}) => {
  const route = "/settings/integrations/notion";
  await page.goto(route);

  await expect(page).toHaveURL(
    new RegExp(`/login\\?next=${encodeURIComponent(route)}$`),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Welcome back." }),
  ).toBeVisible();
});

test("renders the sign-in form without revealing membership", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 768, height: 900 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/login");

    await expect(
      page.getByRole("textbox", { name: "Institutional email" }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Send secure sign-in link" }),
    ).toBeEnabled();
    await expect(page.getByText("Authorized members only")).toBeVisible();
    await expect(
      page.getByText("A matching username alone is not enough."),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test("uses a generic access-denied response", async ({ page }) => {
  await page.goto("/access-denied");

  await expect(
    page.getByRole("heading", { level: 1, name: "Access unavailable." }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "This message does not confirm whether an invitation or account exists.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Return to sign in" }),
  ).toHaveAttribute("href", "/login");
});

test("supports keyboard focus and reduced motion on sign in", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");

  await page.keyboard.press("Tab");

  await expect(
    page.getByRole("textbox", { name: "Institutional email" }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  ).toBe(true);
});
