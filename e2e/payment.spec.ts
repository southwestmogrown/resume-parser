import { test, expect } from "@playwright/test";
import { mockAllApis } from "./helpers/api-mocks";
import { seedWorkspaceState } from "./helpers/actions";
import { MOCK_MATCH_RESULT, MOCK_RESUME_DATA, MOCK_JOB_DESCRIPTION } from "./fixtures/api-responses";

test.describe("Payment Flow", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
    // Seed state: scored but no token (PayGate should show)
    await seedWorkspaceState(page, {
      resumeData: MOCK_RESUME_DATA,
      matchResult: MOCK_MATCH_RESULT,
      jobDescriptions: [MOCK_JOB_DESCRIPTION],
    });
    await page.goto("/app");
  });

  test("after scoring with no token, PayGate is visible", async ({ page }) => {
    // PayGate heading includes score + "unlock the full analysis"
    await expect(page.getByText(/unlock the full analysis/i)).toBeVisible();
    await expect(page.getByTestId("unlock-button")).toBeVisible();
  });

  test("PayGate shows score and feature list", async ({ page }) => {
    await expect(page.getByText("72%")).toBeVisible();
    // Feature list items from PayGate component
    await expect(page.getByText(/Bullet rewrites/i)).toBeVisible();
    await expect(page.getByText(/Study plan/i)).toBeVisible();
    await expect(page.getByText(/Cover letter/i)).toBeVisible();
    await expect(page.getByText(/STAR interview coaching/i)).toBeVisible();
  });

  test("click unlock opens CheckoutModal", async ({ page }) => {
    await page.getByTestId("unlock-button").click();

    // Wait for checkout dialog
    await expect(page.locator('[role="dialog"][aria-label="Checkout"]')).toBeVisible();
  });

  test("close checkout modal via close button", async ({ page }) => {
    await page.getByTestId("unlock-button").click();
    await expect(page.locator('[role="dialog"][aria-label="Checkout"]')).toBeVisible();

    // Close button has aria-label="Close checkout"
    await page.getByRole("button", { name: "Close checkout" }).click();
    await expect(page.locator('[role="dialog"][aria-label="Checkout"]')).toBeHidden();
  });

  test("close checkout modal via backdrop click", async ({ page }) => {
    await page.getByTestId("unlock-button").click();
    await expect(page.locator('[role="dialog"][aria-label="Checkout"]')).toBeVisible();

    // Click the backdrop (the outer modal-backdrop div)
    // The modal-backdrop gets the click handler; clicking at the edge should hit it
    await page.locator(".modal-backdrop").click({ position: { x: 5, y: 5 } });
    await expect(page.locator('[role="dialog"][aria-label="Checkout"]')).toBeHidden();
  });

  test("after payment, locked tab icons disappear", async ({ page }) => {
    // Before payment: locked icons should be present
    const lockedIcons = page.locator('[aria-label="locked"]');
    await expect(lockedIcons.first()).toBeVisible();

    // Simulate payment by setting token via localStorage
    await page.evaluate(() => {
      const stored = window.localStorage.getItem("ps_workspace_v1");
      if (stored) {
        const state = JSON.parse(stored);
        state.analysisToken = "test-token-abc123";
        state.tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        window.localStorage.setItem("ps_workspace_v1", JSON.stringify(state));
      }
    });

    // Reload to pick up new state
    await page.reload();

    // Locked icons should be gone
    await expect(lockedIcons).toHaveCount(0);
  });
});
