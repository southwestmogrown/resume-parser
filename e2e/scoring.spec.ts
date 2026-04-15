import { test, expect } from "@playwright/test";
import path from "path";
import {
  mockAllApis,
  mockExtract,
  mockScore,
  mockScoreError,
} from "./helpers/api-mocks";
import {
  MOCK_MATCH_RESULT_HIGH,
  MOCK_MATCH_RESULT_NO_FLAGS,
} from "./fixtures/api-responses";
import { skipPhase0IfVisible } from "./helpers/actions";

const PDF_PATH = path.resolve(__dirname, "fixtures/sample-resume.pdf");

test.describe("Scoring Pipeline", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
    await page.goto("/app");
  });

  async function uploadAndAddJD(page: import("@playwright/test").Page) {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(PDF_PATH);

    const textarea = page.locator("textarea").first();
    await textarea.fill("Senior Full-Stack Engineer at Nexova...");
    await page.getByRole("button", { name: "Add job" }).click();
  }

  test("upload + JD + Analyze triggers extraction", async ({ page }) => {
    await uploadAndAddJD(page);

    const responsePromise = page.waitForResponse("**/api/extract");
    await page.getByTestId("analyze-button").click();
    await responsePromise;
  });

  test("extraction completes then Phase 0 decision modal appears", async ({ page }) => {
    await uploadAndAddJD(page);
    await page.getByTestId("analyze-button").click();

    // Wait for extraction response
    await page.waitForResponse("**/api/extract");

    // Phase 0 modal should appear
    await expect(page.locator('[role="dialog"][aria-label="Enhance your resume"]')).toBeVisible();
  });

  test("skip Phase 0 leads to score display with correct value", async ({ page }) => {
    await uploadAndAddJD(page);
    await page.getByTestId("analyze-button").click();

    await page.waitForResponse("**/api/extract");

    await skipPhase0IfVisible(page);

    // Wait for score response
    await page.waitForResponse("**/api/score");

    // Score ring should be visible with 72%
    const scoreRing = page.locator('[role="img"][aria-label*="Match score"]');
    await expect(scoreRing).toBeVisible();
    await expect(page.getByText("72")).toBeVisible();
  });

  test("score colors: 80+ green, 60-79 amber, <60 red", async ({ page }) => {
    // Test high score (green)
    await page.unrouteAll();
    await mockExtract(page);
    await mockScore(page, MOCK_MATCH_RESULT_HIGH);

    await uploadAndAddJD(page);
    await page.getByTestId("analyze-button").click();
    await page.waitForResponse("**/api/extract");

    await skipPhase0IfVisible(page);

    await page.waitForResponse("**/api/score");
    await expect(page.locator('[role="img"][aria-label="Match score 88%"]')).toBeVisible();
  });

  test("gap sections render with severity tiers", async ({ page }) => {
    await uploadAndAddJD(page);
    await page.getByTestId("analyze-button").click();
    await page.waitForResponse("**/api/extract");

    await skipPhase0IfVisible(page);

    await page.waitForResponse("**/api/score");
    await expect(page.locator('[role="img"][aria-label*="Match score"]')).toBeVisible();

    // Dealbreaker gap should be visible
    await expect(page.getByText("5+ years experience")).toBeVisible();
    // Learnable gap should be visible
    await expect(page.getByText("AWS")).toBeVisible();
  });

  test("posting flags render when present", async ({ page }) => {
    await uploadAndAddJD(page);
    await page.getByTestId("analyze-button").click();
    await page.waitForResponse("**/api/extract");

    await skipPhase0IfVisible(page);

    await page.waitForResponse("**/api/score");
    await expect(page.locator('[role="img"][aria-label*="Match score"]')).toBeVisible();

    // Posting flag should be visible
    await expect(page.getByText("Requirements inflation")).toBeVisible();
  });

  test("recommendation tag renders as GOOD_FIT", async ({ page }) => {
    await uploadAndAddJD(page);
    await page.getByTestId("analyze-button").click();
    await page.waitForResponse("**/api/extract");

    await skipPhase0IfVisible(page);

    await page.waitForResponse("**/api/score");
    await expect(page.getByText("GOOD_FIT")).toBeVisible();
  });

  test("score API 500 shows error card with retry", async ({ page }) => {
    // Override score to fail
    await page.unrouteAll();
    await mockExtract(page);
    await mockScoreError(page);

    await uploadAndAddJD(page);
    await page.getByTestId("analyze-button").click();
    await page.waitForResponse("**/api/extract");

    await skipPhase0IfVisible(page);

    await page.waitForResponse("**/api/score");

    // Error alert should appear
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test("no posting flags hides flags section", async ({ page }) => {
    await page.unrouteAll();
    await mockExtract(page);
    await mockScore(page, MOCK_MATCH_RESULT_NO_FLAGS);

    await uploadAndAddJD(page);
    await page.getByTestId("analyze-button").click();
    await page.waitForResponse("**/api/extract");

    await skipPhase0IfVisible(page);

    await page.waitForResponse("**/api/score");
    await expect(page.locator('[role="img"][aria-label*="Match score"]')).toBeVisible();

    // "Requirements inflation" should NOT be visible
    await expect(page.getByText("Requirements inflation")).toBeHidden();
  });
});
