import { test, expect } from "@playwright/test";
import { blockExternalScripts } from "./helpers/api-mocks";

test.describe("Demo Tour", () => {
  test.beforeEach(async ({ page }) => {
    await blockExternalScripts(page);
    await page.goto("/demo");
  });

  test("tour auto-starts on /demo with welcome step", async ({ page }) => {
    // Tour tooltip should show welcome message (title text from tourConfig step 0)
    await expect(page.getByText("Welcome to the demo")).toBeVisible();
    // Step counter should show "Step 1 of"
    await expect(page.getByText(/Step 1 of/)).toBeVisible();
  });

  test("Next button advances the tour", async ({ page }) => {
    await expect(page.getByText("Welcome to the demo")).toBeVisible();

    // Click Next → (button text in TourOverlay)
    await page.getByRole("button", { name: /next/i }).click();

    // Tour should advance — step 2 title should show
    await expect(page.getByText("Upload your resume")).toBeVisible();
    await expect(page.getByText(/Step 2 of/)).toBeVisible();
  });

  test("Back button goes to previous step", async ({ page }) => {
    // Advance one step
    await page.getByRole("button", { name: /next/i }).click();
    await expect(page.getByText("Upload your resume")).toBeVisible();

    // Go back (button text is "← Back")
    await page.getByRole("button", { name: /back/i }).click();
    await expect(page.getByText("Welcome to the demo")).toBeVisible();
  });

  test("Skip tour button (✕) jumps to end and shows Take a tour button", async ({ page }) => {
    // The close button has aria-label="Skip tour"
    await page.getByRole("button", { name: "Skip tour" }).click();

    // Tour should be over — welcome text gone
    await expect(page.getByText("Welcome to the demo")).toBeHidden();

    // "Take a tour" restart button should appear in nav
    await expect(page.getByRole("button", { name: /take a tour/i })).toBeVisible();
  });

  test("Take a tour button resets tour to step 0", async ({ page }) => {
    // Skip to end
    await page.getByRole("button", { name: "Skip tour" }).click();
    await expect(page.getByText("Welcome to the demo")).toBeHidden();

    // Restart
    await page.getByRole("button", { name: /take a tour/i }).click();

    // Tour should be back at welcome
    await expect(page.getByText("Welcome to the demo")).toBeVisible();
  });

  test("tour progresses through scoring step — match score becomes visible", async ({ page }) => {
    // Advance through steps until "Your match score" step (step 7 in tourConfig)
    for (let i = 0; i < 6; i++) {
      await page.getByRole("button", { name: /next/i }).click();
    }

    // "Your match score" step title should be visible
    await expect(page.getByText("Your match score")).toBeVisible();
  });

  test("tour progresses through paid steps — result tabs appear", async ({ page }) => {
    // Advance through steps to "Bullet rewrites" step (step 9 in tourConfig)
    for (let i = 0; i < 8; i++) {
      await page.getByRole("button", { name: /next/i }).click();
    }

    // "Bullet rewrites" step title should be visible
    await expect(page.getByText("Bullet rewrites")).toBeVisible();
  });

  test("no real API calls during tour", async ({ page }) => {
    const apiCalls: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/api/") && !url.includes("_next")) {
        apiCalls.push(url);
      }
    });

    // Skip through the entire tour
    await page.getByRole("button", { name: "Skip tour" }).click();
    await expect(page.getByText("Welcome to the demo")).toBeHidden();

    expect(apiCalls).toHaveLength(0);
  });
});
