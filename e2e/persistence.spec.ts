import { test, expect } from "@playwright/test";
import { mockAllApis, blockExternalScripts } from "./helpers/api-mocks";
import {
  MOCK_RESUME_DATA,
  MOCK_MATCH_RESULT,
  buildWorkspaceState,
  buildFullWorkspaceState,
} from "./fixtures/api-responses";

test.describe("localStorage State Persistence", () => {
  test("complete analysis state survives page reload", async ({ page }) => {
    await mockAllApis(page);

    // Seed full state
    const state = buildFullWorkspaceState();
    await page.addInitScript((data: string) => {
      window.localStorage.setItem("ps_workspace_v1", data);
    }, JSON.stringify(state));

    await page.goto("/app");

    // Score should be visible
    await expect(page.locator('[role="img"][aria-label*="Match score"]')).toBeVisible();

    // Reload
    await page.reload();

    // State should be restored — score still visible
    await expect(page.locator('[role="img"][aria-label*="Match score"]')).toBeVisible();
    await expect(page.getByText("72")).toBeVisible();
  });

  test("clear localStorage leads to empty state on reload", async ({ page }) => {
    await mockAllApis(page);

    // Seed state
    const state = buildWorkspaceState({ resumeData: MOCK_RESUME_DATA, matchResult: MOCK_MATCH_RESULT });
    await page.addInitScript((data: string) => {
      window.localStorage.setItem("ps_workspace_v1", data);
    }, JSON.stringify(state));

    await page.goto("/app");
    await expect(page.locator('[role="img"][aria-label*="Match score"]')).toBeVisible();

    // Clear localStorage
    await page.evaluate(() => window.localStorage.removeItem("ps_workspace_v1"));

    // Reload
    await page.reload();

    // Should show empty state — upload dropzone
    await expect(page.getByTestId("upload-dropzone")).toBeVisible();
  });

  test("demo mode does not persist to localStorage", async ({ page }) => {
    await blockExternalScripts(page);
    await page.goto("/demo");

    // Skip tour to load all fixtures (aria-label="Skip tour" on close button)
    await page.getByRole("button", { name: "Skip tour" }).click();

    // Check localStorage — should NOT have workspace key
    const stored = await page.evaluate(() => window.localStorage.getItem("ps_workspace_v1"));
    expect(stored).toBeNull();
  });

  test("corrupted localStorage loads clean state gracefully", async ({ page }) => {
    await mockAllApis(page);

    // Inject corrupted JSON
    await page.addInitScript(() => {
      window.localStorage.setItem("ps_workspace_v1", "{invalid json broken");
    });

    await page.goto("/app");

    // App should load without crashing — show upload dropzone
    await expect(page.getByTestId("upload-dropzone")).toBeVisible();
  });
});
