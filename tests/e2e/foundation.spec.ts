import { expect, test } from "@playwright/test";

test("renders the CapItUp foundation", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("CapItUp");
  await expect(
    page.getByRole("heading", { level: 1, name: "CapItUp" }),
  ).toBeVisible();
  await expect(page.getByText("Repository foundation is ready.")).toBeVisible();
});
