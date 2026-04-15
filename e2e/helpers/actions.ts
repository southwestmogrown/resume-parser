/**
 * Reusable composite actions for Playwright E2E tests.
 * These helpers combine multiple user interactions into named workflows.
 */

import { type Page, expect } from "@playwright/test";
import path from "path";
import {
  MOCK_JOB_DESCRIPTION,
  MOCK_TOKEN_RESPONSE,
  buildWorkspaceState,
  buildFullWorkspaceState,
} from "../fixtures/api-responses";
import { mockAllApis } from "./api-mocks";

const PDF_PATH = path.resolve(__dirname, "../fixtures/sample-resume.pdf");

/* ── Upload a resume ─────────────────────────────────────────────── */

export async function uploadResume(page: Page, pdfPath = PDF_PATH) {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(pdfPath);
}

/* ── Add a job description ───────────────────────────────────────── */

export async function addJobDescription(page: Page, jdText = MOCK_JOB_DESCRIPTION) {
  const textarea = page.locator("textarea").first();
  await textarea.fill(jdText);
  await page.getByRole("button", { name: "Add job" }).click();
}

/* ── Run the free pipeline (upload + JD + analyze + skip phase0 + wait for score) */

export async function runFreePipeline(page: Page) {
  await mockAllApis(page);
  await page.goto("/app");

  // Upload
  await uploadResume(page);

  // Add JD
  const textarea = page.locator("textarea").first();
  await textarea.fill(MOCK_JOB_DESCRIPTION);
  await page.getByRole("button", { name: "Add job" }).click();

  // Click Analyze
  await page.getByTestId("analyze-button").click();

  // Wait for extraction API response
  await page.waitForResponse("**/api/extract");

  // Skip Phase 0 if the decision modal appears
  const skipButton = page.getByRole("button", { name: /skip/i });
  if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipButton.click();
  }

  // Wait for score ring to be visible
  await expect(page.locator('[role="img"][aria-label*="Match score"]')).toBeVisible();
}

/* ── Seed localStorage with workspace state ──────────────────────── */

export async function seedWorkspaceState(
  page: Page,
  overrides: Record<string, unknown> = {},
) {
  const state = buildWorkspaceState(overrides);
  await page.addInitScript((data: string) => {
    window.localStorage.setItem("ps_workspace_v1", data);
  }, JSON.stringify(state));
}

/** Seed with fully-unlocked state (all paid content populated) */
export async function seedFullWorkspaceState(page: Page) {
  const state = buildFullWorkspaceState();
  await page.addInitScript((data: string) => {
    window.localStorage.setItem("ps_workspace_v1", data);
  }, JSON.stringify(state));
}

/** Inject a valid analysis token into localStorage */
export async function seedToken(
  page: Page,
  token = MOCK_TOKEN_RESPONSE.token,
  expiresAt = MOCK_TOKEN_RESPONSE.expiresAt,
) {
  await seedWorkspaceState(page, { analysisToken: token, tokenExpiresAt: expiresAt });
}

/* ── Wait for an API response ────────────────────────────────────── */

export async function waitForApi(page: Page, urlPattern: string, expectedStatus?: number) {
  const response = await page.waitForResponse(urlPattern);
  if (expectedStatus !== undefined) {
    expect(response.status()).toBe(expectedStatus);
  }
  return response;
}
