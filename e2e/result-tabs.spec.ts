import { test, expect } from "@playwright/test";
import { mockAllApis } from "./helpers/api-mocks";
import { seedFullWorkspaceState } from "./helpers/actions";

test.describe("Result Tabs", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
    await seedFullWorkspaceState(page);
    await page.goto("/app");
  });

  test("tab bar visible with 5 tabs", async ({ page }) => {
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(5);
  });

  test("click Bullet Rewrites tab shows rewrite content", async ({ page }) => {
    await page.getByRole("tab", { name: /bullet rewrites/i }).click();

    // Rewrite content should be visible
    await expect(page.getByText(/Software Engineer @ Streamline Labs/i)).toBeVisible();
  });

  test("copy button on rewrite shows Copied state", async ({ page }) => {
    await page.getByRole("tab", { name: /bullet rewrites/i }).click();

    // Grant clipboard permissions
    await page.context().grantPermissions(["clipboard-write"]);

    const copyBtn = page.getByRole("button", { name: "Copy" }).first();
    await copyBtn.click();

    await expect(page.getByText("Copied")).toBeVisible();
  });

  test("click Study Plan tab shows study items", async ({ page }) => {
    await page.getByRole("tab", { name: /study plan/i }).click();

    // Study items should be visible
    await expect(page.getByText("AWS")).toBeVisible();
    await expect(page.getByText("CI/CD pipelines")).toBeVisible();
  });

  test("click Cover Letter tab shows cover letter text", async ({ page }) => {
    await page.getByRole("tab", { name: /cover letter/i }).click();

    // Cover letter content should be visible
    await expect(page.getByText(/Dear Hiring Team/i)).toBeVisible();
  });

  test("click Interview Prep tab shows STAR prep layout", async ({ page }) => {
    await page.getByRole("tab", { name: /interview prep/i }).click();

    // STAR prep elements should be visible
    // CSS class fallback — no ARIA role on question cards; class is stable
    await expect(page.locator(".star-q-card").first()).toBeVisible();
  });

  test("click Optimized Resume tab shows resume content", async ({ page }) => {
    await page.getByRole("tab", { name: /optimized resume/i }).click();

    // Resume content should be visible
    await expect(page.getByText(/Jordan Rivera/i)).toBeVisible();
  });

  test("rapid tab switching shows correct panel", async ({ page }) => {
    // Click through tabs quickly
    await page.getByRole("tab", { name: /study plan/i }).click();
    await page.getByRole("tab", { name: /cover letter/i }).click();
    await page.getByRole("tab", { name: /bullet rewrites/i }).click();

    // Should show rewrites content, not cover letter
    await expect(page.getByText(/Software Engineer @ Streamline Labs/i)).toBeVisible();
  });
});
