import { test, expect } from "@playwright/test";
import { mockAllApis } from "./helpers/api-mocks";
import { seedFullWorkspaceState } from "./helpers/actions";

test.describe("Reset Workspace", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
    await seedFullWorkspaceState(page);
    await page.goto("/app");
  });

  test("click New analysis shows confirmation modal", async ({ page }) => {
    await page.getByTestId("new-analysis-button").click();

    // CSS class — no role/aria attribute on the reset confirm modal
    await expect(page.locator(".reset-confirm-modal")).toBeVisible();
  });

  test("confirmation modal lists items that will be lost", async ({ page }) => {
    await page.getByTestId("new-analysis-button").click();

    const modal = page.locator(".reset-confirm-modal");
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/permanently lose/i)).toBeVisible();
  });

  test("Download everything first triggers zip export", async ({ page }) => {
    await page.getByTestId("new-analysis-button").click();
    await expect(page.locator(".reset-confirm-modal")).toBeVisible();

    // Listen for download
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download everything/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.zip$/);
  });

  test("Yes delete everything resets to empty state", async ({ page }) => {
    await page.getByTestId("new-analysis-button").click();
    await expect(page.locator(".reset-confirm-modal")).toBeVisible();

    await page.getByRole("button", { name: /yes.*delete/i }).click();

    // Modal should close
    await expect(page.locator(".reset-confirm-modal")).toBeHidden();

    // Upload dropzone should be visible (fresh state)
    await expect(page.getByTestId("upload-dropzone")).toBeVisible();

    // localStorage should be cleared
    const stored = await page.evaluate(() => window.localStorage.getItem("ps_workspace_v1"));
    expect(stored).toBeNull();
  });

  test("cancel modal does not reset state", async ({ page }) => {
    await page.getByTestId("new-analysis-button").click();
    await expect(page.locator(".reset-confirm-modal")).toBeVisible();

    // Close via cancel/keep button
    await page.getByRole("button", { name: /keep|cancel|nevermind/i }).click();

    // Modal should close
    await expect(page.locator(".reset-confirm-modal")).toBeHidden();

    // Score should still be visible
    await expect(page.locator('[role="img"][aria-label*="Match score"]')).toBeVisible();
  });
});
