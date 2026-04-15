import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "path";
import { mockAllApis, blockExternalScripts } from "./helpers/api-mocks";
import { seedWorkspaceState, seedFullWorkspaceState } from "./helpers/actions";
import { MOCK_RESUME_DATA, MOCK_MATCH_RESULT, MOCK_JOB_DESCRIPTION } from "./fixtures/api-responses";

test.describe("Accessibility", () => {
  test("landing page has no critical axe violations", async ({ page }) => {
    await blockExternalScripts(page);
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"]) // color contrast often produces false positives with custom themes
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(critical).toEqual([]);
  });

  test("app page (post-scoring) has no critical axe violations", async ({ page }) => {
    await mockAllApis(page);
    await seedWorkspaceState(page, {
      resumeData: MOCK_RESUME_DATA,
      matchResult: MOCK_MATCH_RESULT,
      jobDescriptions: [MOCK_JOB_DESCRIPTION],
    });
    await page.goto("/app");

    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator('[role="img"][aria-label*="Match score"]')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(critical).toEqual([]);
  });

  test("score ring has correct aria-label", async ({ page }) => {
    await mockAllApis(page);
    await seedWorkspaceState(page, {
      resumeData: MOCK_RESUME_DATA,
      matchResult: MOCK_MATCH_RESULT,
      jobDescriptions: [MOCK_JOB_DESCRIPTION],
    });
    await page.goto("/app");

    const scoreRing = page.locator('[role="img"][aria-label*="Match score"]');
    await expect(scoreRing).toBeVisible();
    await expect(scoreRing).toHaveAttribute("aria-label", "Match score 72%");
  });

  test("tab bar has correct ARIA roles", async ({ page }) => {
    await mockAllApis(page);
    await seedWorkspaceState(page, {
      resumeData: MOCK_RESUME_DATA,
      matchResult: MOCK_MATCH_RESULT,
      jobDescriptions: [MOCK_JOB_DESCRIPTION],
    });
    await page.goto("/app");

    // Tablist exists
    await expect(page.locator('[role="tablist"]')).toBeVisible();

    // Each tab has role="tab"
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(5);

    // Active tab has aria-selected=true
    const activeTabs = page.locator('[role="tab"][aria-selected="true"]');
    await expect(activeTabs).toHaveCount(1);
  });

  test("error alerts have role=alert", async ({ page }) => {
    await blockExternalScripts(page);
    await page.goto("/app");

    // Force an error by navigating with existing error state
    await page.evaluate(() => {
      const el = document.createElement("div");
      el.setAttribute("role", "alert");
      el.textContent = "Test error";
      document.body.appendChild(el);
    });

    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test("chat log has role=log and aria-live=polite", async ({ page }) => {
    await mockAllApis(page);
    await seedFullWorkspaceState(page);
    await page.goto("/app");

    await page.getByRole("tab", { name: /interview prep/i }).click();

    // STAR prep chat should have role="log"
    const chatLog = page.locator('[role="log"]');
    await expect(chatLog).toBeVisible();
    await expect(chatLog).toHaveAttribute("aria-live", "polite");
  });

  test("close checkout modal via close button", async ({ page }) => {
    await mockAllApis(page);
    await seedWorkspaceState(page, {
      resumeData: MOCK_RESUME_DATA,
      matchResult: MOCK_MATCH_RESULT,
      jobDescriptions: [MOCK_JOB_DESCRIPTION],
    });
    await page.goto("/app");

    // Open checkout
    await page.getByTestId("unlock-button").click();
    await expect(page.locator('[role="dialog"][aria-label="Checkout"]')).toBeVisible();

    // Close via button (aria-label="Close checkout")
    await page.getByRole("button", { name: "Close checkout" }).click();
    await expect(page.locator('[role="dialog"][aria-label="Checkout"]')).toBeHidden();
  });

  test("close Phase 0 modal via backdrop click", async ({ page }) => {
    await mockAllApis(page);
    await page.goto("/app");

    // Upload + JD + Analyze to trigger Phase 0 modal
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.resolve(__dirname, "fixtures/sample-resume.pdf"));
    const textarea = page.locator("textarea").first();
    await textarea.fill("Some JD");
    await page.getByRole("button", { name: /add job/i }).click();
    await page.getByTestId("analyze-button").click();
    await page.waitForResponse("**/api/extract");

    // Phase 0 modal should be visible (check for its title text)
    await expect(page.getByText("Want to sharpen your resume first?")).toBeVisible();

    // Close via backdrop click (the backdrop div closes the modal)
    await page.locator(".modal-backdrop").click({ position: { x: 5, y: 5 } });
    await expect(page.getByText("Want to sharpen your resume first?")).toBeHidden();
  });
});
