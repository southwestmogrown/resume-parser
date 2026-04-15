/**
 * Reusable page.route() interceptors for every API endpoint.
 * All mocks return fixture data — no real Anthropic / Stripe / Supabase calls.
 */

import { type Page, type Route } from "@playwright/test";
import {
  MOCK_RESUME_DATA,
  MOCK_MATCH_RESULT,
  MOCK_MATCH_RESULT_NO_FLAGS,
  MOCK_REWRITE_SUGGESTIONS,
  MOCK_STUDY_ITEMS,
  MOCK_COVER_LETTER,
  MOCK_GITHUB_PROFILE,
  MOCK_LINKEDIN_PROFILE,
  MOCK_INTERVIEW_FIRST_RESPONSE,
  MOCK_INTERVIEW_COMPLETE,
  MOCK_STAR_QUESTIONS,
  MOCK_STAR_PREP_CONTINUE,
  MOCK_STAR_PREP_COMPLETE,
  MOCK_OPTIMIZED_RESUME,
  MOCK_PAYMENT_INTENT,
  MOCK_TOKEN_RESPONSE,
} from "../fixtures/api-responses";

/* ── Individual mocks ──────────────────────────────────────────────── */

export async function mockExtract(page: Page) {
  await page.route("**/api/extract", (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ resumeData: MOCK_RESUME_DATA }) }),
  );
}

export async function mockScore(page: Page, result = MOCK_MATCH_RESULT) {
  await page.route("**/api/score", (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ matchResult: result }) }),
  );
}

export async function mockScoreNoFlags(page: Page) {
  return mockScore(page, MOCK_MATCH_RESULT_NO_FLAGS);
}

export async function mockRewrite(page: Page) {
  await page.route("**/api/rewrite", (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ suggestions: MOCK_REWRITE_SUGGESTIONS }) }),
  );
}

export async function mockStudyPlan(page: Page) {
  await page.route("**/api/study-plan", (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: MOCK_STUDY_ITEMS }) }),
  );
}

export async function mockCoverLetter(page: Page) {
  await page.route("**/api/cover-letter", (route: Route) =>
    route.fulfill({ status: 200, contentType: "text/plain", body: MOCK_COVER_LETTER }),
  );
}

export async function mockCoverLetterDealbreaker(page: Page) {
  await page.route("**/api/cover-letter", (route: Route) =>
    route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ error: "Dealbreakers detected", dealbreakers: ["5+ years experience"] }),
    }),
  );
}

export async function mockGitHub(page: Page) {
  await page.route("**/api/github-profile", (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ profile: MOCK_GITHUB_PROFILE }) }),
  );
}

export async function mockGitHub404(page: Page) {
  await page.route("**/api/github-profile", (route: Route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "User not found" }) }),
  );
}

export async function mockLinkedIn(page: Page) {
  await page.route("**/api/linkedin-profile", (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ profile: MOCK_LINKEDIN_PROFILE }) }),
  );
}

const interviewCallCounts = new WeakMap<Page, number>();

export async function mockInterview(page: Page) {
  interviewCallCounts.set(page, 0);
  await page.route("**/api/interview", (route: Route) => {
    const count = (interviewCallCounts.get(page) ?? 0) + 1;
    interviewCallCounts.set(page, count);
    const response = count >= 3 ? MOCK_INTERVIEW_COMPLETE : MOCK_INTERVIEW_FIRST_RESPONSE;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
}

export async function mockStarQuestions(page: Page) {
  await page.route("**/api/generate-star-questions", (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ questions: MOCK_STAR_QUESTIONS }) }),
  );
}

const starPrepCallCounts = new WeakMap<Page, number>();

export async function mockStarPrep(page: Page) {
  starPrepCallCounts.set(page, 0);
  await page.route("**/api/star-prep", (route: Route) => {
    const count = (starPrepCallCounts.get(page) ?? 0) + 1;
    starPrepCallCounts.set(page, count);
    const response = count >= 3 ? MOCK_STAR_PREP_COMPLETE : MOCK_STAR_PREP_CONTINUE;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
}

export async function mockOptimizedResume(page: Page) {
  await page.route("**/api/optimized-resume", (route: Route) =>
    route.fulfill({ status: 200, contentType: "text/plain", body: MOCK_OPTIMIZED_RESUME }),
  );
}

export async function mockPaymentIntent(page: Page) {
  await page.route("**/api/create-payment-intent", (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_PAYMENT_INTENT) }),
  );
}

export async function mockMintToken(page: Page) {
  await page.route("**/api/mint-from-payment-intent", (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_TOKEN_RESPONSE) }),
  );
}

export async function mockBatchScore(page: Page) {
  await page.route("**/api/score", (route: Route) => {
    // Return a different batch result per call based on the incoming JD
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ matchResult: MOCK_MATCH_RESULT }),
    });
  });
}

/* ── Convenience: mock all APIs at once ────────────────────────────── */

export async function mockAllApis(page: Page) {
  // Block external Stripe.js to prevent network-dependent hangs in CI
  await blockExternalScripts(page);

  await mockExtract(page);
  await mockScore(page);
  await mockRewrite(page);
  await mockStudyPlan(page);
  await mockCoverLetter(page);
  await mockGitHub(page);
  await mockLinkedIn(page);
  await mockInterview(page);
  await mockStarQuestions(page);
  await mockStarPrep(page);
  await mockOptimizedResume(page);
  await mockPaymentIntent(page);
  await mockMintToken(page);
}

/* ── Block external scripts (for tests that don't use mockAllApis) ── */

export async function blockExternalScripts(page: Page) {
  await page.route("https://js.stripe.com/**", (route: Route) => route.abort());
  await page.route("https://m.stripe.com/**", (route: Route) => route.abort());
  await page.route("https://r.stripe.com/**", (route: Route) => route.abort());
}

/* ── Error variants ────────────────────────────────────────────────── */

export async function mockExtractError(page: Page) {
  await page.route("**/api/extract", (route: Route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Extraction failed" }) }),
  );
}

export async function mockScoreError(page: Page) {
  await page.route("**/api/score", (route: Route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Scoring failed" }) }),
  );
}

export async function mockRewriteUnauthorized(page: Page) {
  await page.route("**/api/rewrite", (route: Route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Token invalid" }) }),
  );
}

export async function mockRateLimit(page: Page, path: string) {
  await page.route(`**${path}`, (route: Route) =>
    route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: "Rate limited" }) }),
  );
}

export async function mockSlowExtract(page: Page, delayMs = 5000) {
  await page.route("**/api/extract", async (route: Route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ resumeData: MOCK_RESUME_DATA }) });
  });
}
