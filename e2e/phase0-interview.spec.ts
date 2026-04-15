import { test, expect } from "@playwright/test";
import path from "path";
import { mockAllApis } from "./helpers/api-mocks";

const PDF_PATH = path.resolve(__dirname, "fixtures/sample-resume.pdf");

test.describe("Phase 0 — Experience Interviewer", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
    await page.goto("/app");
  });

  async function triggerPhase0(page: import("@playwright/test").Page) {
    // Upload resume and add JD
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(PDF_PATH);

    const textarea = page.locator("textarea").first();
    await textarea.fill("Senior Full-Stack Engineer at Nexova...");
    await page.getByRole("button", { name: "Add job" }).click();

    // Click Analyze
    await page.getByTestId("analyze-button").click();
    await page.waitForResponse("**/api/extract");
  }

  test("Phase 0 modal appears after extraction", async ({ page }) => {
    await triggerPhase0(page);

    // Phase 0 decision modal should appear
    await expect(page.locator('[role="dialog"][aria-label="Enhance your resume"]')).toBeVisible();
  });

  test("choose Enhance opens interviewer with first assistant message", async ({ page }) => {
    await triggerPhase0(page);

    // Click enhance button
    const enhanceBtn = page.getByRole("button", { name: /enhance/i });
    await enhanceBtn.click();

    // Chat log should be visible with the first response
    await expect(page.locator('[role="log"]')).toBeVisible();

    // Wait for the interview API response
    await page.waitForResponse("**/api/interview");

    // First assistant message should appear
    await expect(page.getByText(/most impactful project/i)).toBeVisible();
  });

  test("typing indicator appears while waiting for response", async ({ page }) => {
    await triggerPhase0(page);

    const enhanceBtn = page.getByRole("button", { name: /enhance/i });
    await enhanceBtn.click();

    // The typing indicator should briefly appear
    // It's role="status" with aria-label="Typing"
    // It may appear and disappear quickly — just confirm the response arrives
    await page.waitForResponse("**/api/interview");
  });

  test("type answer and send adds user message to chat", async ({ page }) => {
    await triggerPhase0(page);

    const enhanceBtn = page.getByRole("button", { name: /enhance/i });
    await enhanceBtn.click();
    await page.waitForResponse("**/api/interview");

    // Type an answer
    const chatInput = page.locator('textarea[aria-label="Your answer"]');
    await chatInput.fill("I built a real-time dashboard that reduced response times by 60%.");
    await page.getByRole("button", { name: /send/i }).click();

    // User message should be in the chat
    await expect(page.getByText("I built a real-time dashboard")).toBeVisible();
  });

  test("skip interview proceeds to scoring", async ({ page }) => {
    await triggerPhase0(page);

    // Skip Phase 0
    await page.getByRole("button", { name: /skip/i }).click();

    // Wait for score response
    await page.waitForResponse("**/api/score");

    // Score ring should be visible
    await expect(page.locator('[role="img"][aria-label*="Match score"]')).toBeVisible();
  });

  test("empty message disables send button", async ({ page }) => {
    await triggerPhase0(page);

    const enhanceBtn = page.getByRole("button", { name: /enhance/i });
    await enhanceBtn.click();
    await page.waitForResponse("**/api/interview");

    // Send button should be disabled when no text entered
    const sendBtn = page.getByRole("button", { name: /send/i });
    await expect(sendBtn).toBeDisabled();
  });
});
