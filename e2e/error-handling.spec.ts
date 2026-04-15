import { test, expect } from "@playwright/test";
import path from "path";
import {
  mockExtract,
  mockExtractError,
  mockScore,
  mockScoreError,
  mockCoverLetterDealbreaker,
  mockSlowExtract,
  mockAllApis,
} from "./helpers/api-mocks";
import { seedWorkspaceState, skipPhase0IfVisible } from "./helpers/actions";
import {
  MOCK_RESUME_DATA,
  MOCK_MATCH_RESULT,
  MOCK_JOB_DESCRIPTION,
  MOCK_TOKEN_RESPONSE,
} from "./fixtures/api-responses";

const PDF_PATH = path.resolve(__dirname, "fixtures/sample-resume.pdf");

test.describe("Error Handling", () => {
  test("extract API network error shows ErrorCard with Retry", async ({ page }) => {
    await mockExtractError(page);
    await mockScore(page);
    await page.goto("/app");

    // Upload + JD
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(PDF_PATH);
    const textarea = page.locator("textarea").first();
    await textarea.fill("Some job description");
    await page.getByRole("button", { name: "Add job" }).click();

    // Analyze
    await page.getByTestId("analyze-button").click();
    await page.waitForResponse("**/api/extract");

    // Error alert should appear
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  });

  test("score API 500 shows ErrorCard", async ({ page }) => {
    await mockExtract(page);
    await mockScoreError(page);
    await page.goto("/app");

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(PDF_PATH);
    const textarea = page.locator("textarea").first();
    await textarea.fill("Some job description");
    await page.getByRole("button", { name: "Add job" }).click();

    await page.getByTestId("analyze-button").click();
    await page.waitForResponse("**/api/extract");

    // Skip Phase 0
    await skipPhase0IfVisible(page);

    await page.waitForResponse("**/api/score");

    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test("cover letter 422 (dealbreakers) shows blocked state", async ({ page }) => {
    await mockAllApis(page);
    // Override cover letter to return 422
    await page.unroute("**/api/cover-letter");
    await mockCoverLetterDealbreaker(page);

    await seedWorkspaceState(page, {
      resumeData: MOCK_RESUME_DATA,
      matchResult: MOCK_MATCH_RESULT,
      jobDescriptions: [MOCK_JOB_DESCRIPTION],
      analysisToken: MOCK_TOKEN_RESPONSE.token,
      tokenExpiresAt: MOCK_TOKEN_RESPONSE.expiresAt,
    });
    await page.goto("/app");

    // Navigate to cover letter tab
    await page.getByRole("tab", { name: /cover letter/i }).click();

    // Wait for cover letter API — it should return 422
    // The tab should show the blocked state
    await expect(page.getByText(/not generated|dealbreaker/i)).toBeVisible();
  });

  test("slow API keeps spinner visible until response", async ({ page }) => {
    await mockSlowExtract(page, 3000);
    await mockScore(page);
    await page.goto("/app");

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(PDF_PATH);
    const textarea = page.locator("textarea").first();
    await textarea.fill("Some job description");
    await page.getByRole("button", { name: "Add job" }).click();

    await page.getByTestId("analyze-button").click();

    // Spinner should be visible while waiting
    await expect(page.locator(".spinner")).toBeVisible();

    // Wait for the slow response
    await page.waitForResponse("**/api/extract");
  });
});
