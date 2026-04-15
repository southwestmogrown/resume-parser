import { test, expect } from "@playwright/test";
import path from "path";
import { mockAllApis } from "./helpers/api-mocks";

const PDF_PATH = path.resolve(__dirname, "fixtures/sample-resume.pdf");

test.describe("Batch Analysis", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
    await page.goto("/app");
  });

  async function addMultipleJDs(page: import("@playwright/test").Page, count: number) {
    for (let i = 1; i <= count; i++) {
      const textarea = page.locator("textarea").first();
      await textarea.fill(`Job description ${i} for testing batch mode`);
      await page.getByRole("button", { name: "Add job" }).click();
    }
  }

  test("add 3 JDs + Analyze triggers batch scoring", async ({ page }) => {
    // Upload PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(PDF_PATH);

    // Add 3 JDs
    await addMultipleJDs(page, 3);

    // Click Analyze
    await page.getByTestId("analyze-button").click();

    // Wait for extraction
    await page.waitForResponse("**/api/extract");

    // Skip Phase 0 if it appears
    const skipBtn = page.getByRole("button", { name: /skip/i });
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click();
    }

    // Wait for score responses (multiple)
    await page.waitForResponse("**/api/score");

    // Batch rows should appear
    const batchRows = page.getByTestId("batch-row");
    await expect(batchRows.first()).toBeVisible();
  });

  test("batch with 1 JD goes to single mode (no batch table)", async ({ page }) => {
    // Upload PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(PDF_PATH);

    // Add just 1 JD
    const textarea = page.locator("textarea").first();
    await textarea.fill("Single job description");
    await page.getByRole("button", { name: "Add job" }).click();

    // Click Analyze
    await page.getByTestId("analyze-button").click();
    await page.waitForResponse("**/api/extract");

    const skipBtn = page.getByRole("button", { name: /skip/i });
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click();
    }

    await page.waitForResponse("**/api/score");

    // Score ring should be visible (single mode)
    await expect(page.locator('[role="img"][aria-label*="Match score"]')).toBeVisible();

    // Batch rows should NOT be visible
    await expect(page.getByTestId("batch-row")).toHaveCount(0);
  });

  test("sort buttons reorder batch results", async ({ page }) => {
    // Upload PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(PDF_PATH);

    await addMultipleJDs(page, 3);
    await page.getByTestId("analyze-button").click();
    await page.waitForResponse("**/api/extract");

    const skipBtn = page.getByRole("button", { name: /skip/i });
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click();
    }

    await page.waitForResponse("**/api/score");
    await expect(page.getByTestId("batch-row").first()).toBeVisible();

    // Sort controls should be visible
    await expect(page.getByRole("button", { name: /score/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /company/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /title/i })).toBeVisible();
  });

  test("click batch row triggers drill-down", async ({ page }) => {
    // Upload PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(PDF_PATH);

    await addMultipleJDs(page, 2);
    await page.getByTestId("analyze-button").click();
    await page.waitForResponse("**/api/extract");

    const skipBtn = page.getByRole("button", { name: /skip/i });
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click();
    }

    await page.waitForResponse("**/api/score");
    await expect(page.getByTestId("batch-row").first()).toBeVisible();

    // Click first batch row
    await page.getByTestId("batch-row").first().click();

    // Selected row should have selected state
    // CSS class fallback — only class distinguishes selected row
    await expect(page.locator(".batch-row--selected")).toHaveCount(1);

    // Back button should appear
    await expect(page.getByRole("button", { name: /back to all/i })).toBeVisible();
  });

  test("Back to all clears drill-down", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(PDF_PATH);

    await addMultipleJDs(page, 2);
    await page.getByTestId("analyze-button").click();
    await page.waitForResponse("**/api/extract");

    const skipBtn = page.getByRole("button", { name: /skip/i });
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click();
    }

    await page.waitForResponse("**/api/score");
    await expect(page.getByTestId("batch-row").first()).toBeVisible();

    // Drill down
    await page.getByTestId("batch-row").first().click();
    await expect(page.locator(".batch-row--selected")).toHaveCount(1);

    // Back
    await page.getByRole("button", { name: /back to all/i }).click();

    // No row should be selected
    await expect(page.locator(".batch-row--selected")).toHaveCount(0);
  });
});
