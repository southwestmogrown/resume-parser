import { test, expect } from "@playwright/test";

test.describe("Demo Tour", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo");
  });

  test("tour auto-starts on /demo with welcome step", async ({ page }) => {
    // Tour overlay should appear
    await expect(page.locator(".tour-overlay")).toBeVisible();
    // First tooltip should show welcome message
    await expect(page.locator(".tour-tooltip")).toContainText("Welcome to the demo");
  });

  test("Next button advances the tour", async ({ page }) => {
    await expect(page.locator(".tour-tooltip")).toContainText("Welcome to the demo");

    // Click Next
    await page.getByRole("button", { name: /next/i }).click();

    // Tour should advance — tooltip text should change
    await expect(page.locator(".tour-tooltip")).not.toContainText("Welcome to the demo");
  });

  test("Prev button goes back to previous step", async ({ page }) => {
    // Advance one step
    await page.getByRole("button", { name: /next/i }).click();
    await expect(page.locator(".tour-tooltip")).not.toContainText("Welcome to the demo");

    // Go back
    await page.getByRole("button", { name: /prev/i }).click();
    await expect(page.locator(".tour-tooltip")).toContainText("Welcome to the demo");
  });

  test("Skip button jumps to end and shows Restart", async ({ page }) => {
    await page.getByRole("button", { name: /skip/i }).click();

    // Tour overlay should be gone
    await expect(page.locator(".tour-overlay")).toBeHidden();

    // Restart button should appear
    await expect(page.getByRole("button", { name: /restart/i })).toBeVisible();
  });

  test("Restart button resets tour to step 0", async ({ page }) => {
    // Skip to end
    await page.getByRole("button", { name: /skip/i }).click();
    await expect(page.locator(".tour-overlay")).toBeHidden();

    // Restart
    await page.getByRole("button", { name: /restart/i }).click();

    // Tour should be back at welcome
    await expect(page.locator(".tour-overlay")).toBeVisible();
    await expect(page.locator(".tour-tooltip")).toContainText("Welcome to the demo");
  });

  test("tour progresses through scoring step — match score becomes visible", async ({ page }) => {
    // Advance through steps until score is visible (step 6 = TOUR_STEP_SCORE_READY)
    for (let i = 0; i < 6; i++) {
      await page.getByRole("button", { name: /next/i }).click();
    }

    // Score ring should be visible
    await expect(page.locator('[role="img"][aria-label*="Match score"]')).toBeVisible();
  });

  test("tour progresses through paid steps — result tabs appear", async ({ page }) => {
    // Advance through steps to rewrites (step 8 = TOUR_STEP_REWRITES)
    for (let i = 0; i < 8; i++) {
      await page.getByRole("button", { name: /next/i }).click();
    }

    // Tab bar should be visible with tab roles
    await expect(page.locator('[role="tablist"]')).toBeVisible();
  });

  test("no real API calls during tour", async ({ page }) => {
    const apiCalls: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/api/") && !url.includes("_next")) {
        apiCalls.push(url);
      }
    });

    // Run through the entire tour
    await page.getByRole("button", { name: /skip/i }).click();
    await expect(page.locator(".tour-overlay")).toBeHidden();

    expect(apiCalls).toHaveLength(0);
  });
});
