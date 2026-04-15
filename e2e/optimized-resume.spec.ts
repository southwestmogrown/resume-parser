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
  MOCK_STAR_ANSWER,
  MOCK_TOKEN_RESPONSE,
} from "./fixtures/api-responses";

test.describe("Optimized Resume", () => {
  test("before STAR completion shows locked CTA", async ({ page }) => {
    await mockAllApis(page);
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
      starAnswers: [], // No answers yet
    });
    await page.goto("/app");

    await page.getByRole("tab", { name: /optimized resume/i }).click();

    // Should show locked message
    await expect(page.getByText(/complete at least one STAR coaching session/i)).toBeVisible();
  });

  test("after STAR completion shows generate CTA", async ({ page }) => {
    await mockAllApis(page);
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
      starAnswers: [MOCK_STAR_ANSWER],
    });
    await page.goto("/app");

    await page.getByRole("tab", { name: /optimized resume/i }).click();

    // Generate button should be visible
    await expect(page.getByTestId("generate-resume-button")).toBeVisible();
  });

  test("click generate shows spinner then resume content", async ({ page }) => {
    await mockAllApis(page);
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
      starAnswers: [MOCK_STAR_ANSWER],
    });
    await page.goto("/app");

    await page.getByRole("tab", { name: /optimized resume/i }).click();
    await page.getByTestId("generate-resume-button").click();

    // Wait for response
    await page.waitForResponse("**/api/optimized-resume");

    // Resume content should appear
    await expect(page.getByText(/Full-stack engineer who shipped/i)).toBeVisible();
  });

  test("copy button works on generated resume", async ({ page }) => {
    await mockAllApis(page);
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
      starAnswers: [MOCK_STAR_ANSWER],
      optimizedResume: "# Jordan Rivera\nOptimized resume content",
    });
    await page.goto("/app");

    await page.getByRole("tab", { name: /optimized resume/i }).click();

    await page.context().grantPermissions(["clipboard-write"]);
    await page.getByRole("button", { name: "Copy" }).click();
    await expect(page.getByText("Copied")).toBeVisible();
  });

  test("download button triggers .txt file download", async ({ page }) => {
    await mockAllApis(page);
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
      starAnswers: [MOCK_STAR_ANSWER],
      optimizedResume: "# Jordan Rivera\nOptimized resume content",
    });
    await page.goto("/app");

    await page.getByRole("tab", { name: /optimized resume/i }).click();

    // Listen for download
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("optimized-resume.txt");
  });
});
