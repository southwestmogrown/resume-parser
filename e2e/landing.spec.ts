import { test, expect } from "@playwright/test";
import { blockExternalScripts } from "./helpers/api-mocks";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await blockExternalScripts(page);
    await page.goto("/");
  });

  test("renders hero section with logo and headline", async ({ page }) => {
    await expect(page.locator('[aria-label="PassStack home"]').first()).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("renders phase output sections with headings", async ({ page }) => {
    // The landing page has multiple phase sections
    await expect(page.getByText("Upload your resume")).toBeVisible();
  });

  test("renders Honest by Design no-go section", async ({ page }) => {
    await expect(page.getByText(/honest by design/i)).toBeVisible();
  });

  test("renders footer with logo and links", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer.locator('[aria-label="PassStack home"]')).toBeVisible();
  });

  test("Open App link navigates to /app", async ({ page }) => {
    await page.getByRole("link", { name: "Open App" }).first().click();
    await expect(page).toHaveURL(/\/app/);
  });

  test("Try the demo link navigates to /demo", async ({ page }) => {
    await page.getByRole("link", { name: /try the demo/i }).first().click();
    await expect(page).toHaveURL(/\/demo/);
  });
});
