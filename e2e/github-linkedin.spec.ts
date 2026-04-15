import { test, expect } from "@playwright/test";
import { mockGitHub, mockGitHub404, mockLinkedIn, blockExternalScripts } from "./helpers/api-mocks";

test.describe("GitHub + LinkedIn Profile Connections", () => {
  test.beforeEach(async ({ page }) => {
    await blockExternalScripts(page);
    await page.goto("/app");
  });

  test.describe("GitHub Connect", () => {
    test("enter username and connect shows profile card", async ({ page }) => {
      await mockGitHub(page);

      const input = page.locator('input[placeholder="username"]');
      await input.fill("jordev");
      await page.getByRole("button", { name: "Connect" }).click();

      // Wait for the mock response
      await page.waitForResponse("**/api/github-profile");

      // Profile card should show username info
      await expect(page.getByText("jordev")).toBeVisible();
      await expect(page.getByText(/24 public repos/i)).toBeVisible();
    });

    test("GitHub 404 shows error message", async ({ page }) => {
      await mockGitHub404(page);

      const input = page.locator('input[placeholder="username"]');
      await input.fill("nonexistent-user");
      await page.getByRole("button", { name: "Connect" }).click();

      await page.waitForResponse("**/api/github-profile");

      // Error message should appear
      await expect(page.getByText(/not found|error/i)).toBeVisible();
    });

    test("clear profile returns to input", async ({ page }) => {
      await mockGitHub(page);

      const input = page.locator('input[placeholder="username"]');
      await input.fill("jordev");
      await page.getByRole("button", { name: "Connect" }).click();
      await page.waitForResponse("**/api/github-profile");

      await expect(page.getByText("jordev")).toBeVisible();

      // Clear
      await page.getByRole("button", { name: /clear/i }).click();
      await expect(page.locator('input[placeholder="username"]')).toBeVisible();
    });

    test("empty username disables Connect button", async ({ page }) => {
      // The Connect button is disabled when username is empty (!username.trim())
      const connectBtn = page.getByRole("button", { name: "Connect" });
      await expect(connectBtn).toBeDisabled();
    });
  });

  test.describe("LinkedIn Connect", () => {
    test("paste profile text and parse shows profile card", async ({ page }) => {
      await mockLinkedIn(page);

      // Find the LinkedIn textarea — use placeholder text
      const pasteArea = page.locator('textarea[placeholder*="Paste your LinkedIn"]');
      await pasteArea.fill("Jordan Rivera - Full-Stack Engineer...");
      await page.getByRole("button", { name: /parse profile/i }).click();

      await page.waitForResponse("**/api/linkedin-profile");

      // Profile should show name and headline
      await expect(page.getByText("Jordan Rivera")).toBeVisible();
      await expect(page.getByText(/Full-Stack Engineer/i)).toBeVisible();
    });

    test("clear profile returns to paste step", async ({ page }) => {
      await mockLinkedIn(page);

      const pasteArea = page.locator('textarea[placeholder*="Paste your LinkedIn"]');
      await pasteArea.fill("Some LinkedIn text");
      await page.getByRole("button", { name: /parse profile/i }).click();
      await page.waitForResponse("**/api/linkedin-profile");

      await expect(page.getByText("Jordan Rivera")).toBeVisible();

      // Clear
      await page.getByRole("button", { name: /clear/i }).click();

      // Should be back at paste step
      await expect(page.getByRole("button", { name: /parse profile/i })).toBeVisible();
    });

    test("empty paste area disables Parse button", async ({ page }) => {
      // Parse button is disabled when profileText is empty (!profileText.trim())
      const parseBtn = page.getByRole("button", { name: /parse profile/i });
      await expect(parseBtn).toBeDisabled();
    });
  });
});
