import { test, expect } from "@playwright/test";
import { mockAllApis } from "./helpers/api-mocks";
import { seedWorkspaceState } from "./helpers/actions";
import {
  MOCK_RESUME_DATA,
  MOCK_MATCH_RESULT,
  MOCK_JOB_DESCRIPTION,
  MOCK_REWRITE_SUGGESTIONS,
  MOCK_STUDY_ITEMS,
  MOCK_COVER_LETTER,
  MOCK_STAR_QUESTIONS,
  MOCK_TOKEN_RESPONSE,
} from "./fixtures/api-responses";

test.describe("STAR Interview Coaching", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
    // Seed with token + match + star questions (paid content ready)
    await seedWorkspaceState(page, {
      resumeData: MOCK_RESUME_DATA,
      matchResult: MOCK_MATCH_RESULT,
      jobDescriptions: [MOCK_JOB_DESCRIPTION],
      analysisToken: MOCK_TOKEN_RESPONSE.token,
      tokenExpiresAt: MOCK_TOKEN_RESPONSE.expiresAt,
      rewriteSuggestions: MOCK_REWRITE_SUGGESTIONS,
      studyItems: MOCK_STUDY_ITEMS,
      coverLetter: MOCK_COVER_LETTER,
      starQuestions: MOCK_STAR_QUESTIONS,
    });
    await page.goto("/app");
  });

  test("question list renders all questions", async ({ page }) => {
    await page.getByRole("tab", { name: /interview prep/i }).click();

    // CSS class fallback — no ARIA role on question cards; class is stable
    const questionCards = page.locator(".star-q-card");
    await expect(questionCards).toHaveCount(MOCK_STAR_QUESTIONS.length);
  });

  test("first question is auto-selected", async ({ page }) => {
    await page.getByRole("tab", { name: /interview prep/i }).click();

    // CSS class fallback — only class distinguishes active card
    await expect(page.locator(".star-q-card--active")).toHaveCount(1);
  });

  test("click different question switches active card", async ({ page }) => {
    await page.getByRole("tab", { name: /interview prep/i }).click();

    // Click second question card
    const cards = page.locator(".star-q-card");
    await cards.nth(1).click();

    // Second card should now be active
    await expect(cards.nth(1)).toHaveClass(/star-q-card--active/);
  });

  test("type answer and send shows user message and coach response", async ({ page }) => {
    await page.getByRole("tab", { name: /interview prep/i }).click();

    // Type an answer
    const chatInput = page.locator('textarea[aria-label="Your STAR answer"]');
    await chatInput.fill("In my previous role, I had to learn AWS quickly for a critical deployment.");
    await page.getByRole("button", { name: /send/i }).click();

    // User message should appear
    await expect(page.getByText("In my previous role")).toBeVisible();

    // Wait for coach response
    await page.waitForResponse("**/api/star-prep");

    // Coach response should appear
    await expect(page.getByText(/more specific/i)).toBeVisible();
  });

  test("complete a question marks card as done", async ({ page }) => {
    await page.getByRole("tab", { name: /interview prep/i }).click();

    // Send enough messages to trigger completion (mock completes after 3 calls)
    const chatInput = page.locator('textarea[aria-label="Your STAR answer"]');

    for (let i = 0; i < 3; i++) {
      await chatInput.fill(`Answer turn ${i + 1}: I used AWS to deploy the service.`);
      await page.getByRole("button", { name: /send/i }).click();
      await page.waitForResponse("**/api/star-prep");
    }

    // First card should be marked done
    // CSS class fallback — only class distinguishes completed card
    await expect(page.locator(".star-q-card--done").first()).toBeVisible();
  });
});
