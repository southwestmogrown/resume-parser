import { test, expect } from "@playwright/test";
import path from "path";
import { mockAllApis } from "./helpers/api-mocks";

const PDF_PATH = path.resolve(__dirname, "fixtures/sample-resume.pdf");
const INVALID_FILE_PATH = path.resolve(__dirname, "fixtures/sample-resume-invalid.txt");

test.describe("Resume Upload + JD Input", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page);
    await page.goto("/app");
  });

  test("empty state: dropzone visible, Analyze button disabled", async ({ page }) => {
    await expect(page.getByTestId("upload-dropzone")).toBeVisible();
    const analyzeBtn = page.getByTestId("analyze-button");
    await expect(analyzeBtn).toBeDisabled();
  });

  test("upload valid PDF via setInputFiles shows filename chip", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(PDF_PATH);

    // Filename chip should appear with the file name
    await expect(page.getByText("sample-resume.pdf")).toBeVisible();
  });

  test("upload non-PDF shows error message", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    // Non-PDF files may be blocked by accept="application/pdf" so use dispatchEvent
    // or check for the error text that appears
    await fileInput.setInputFiles(INVALID_FILE_PATH);

    // The component shows "Only PDF files are accepted." for invalid files
    await expect(page.getByText(/only pdf files/i)).toBeVisible();
  });

  test("clear uploaded file returns to dropzone", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(PDF_PATH);
    await expect(page.getByText("sample-resume.pdf")).toBeVisible();

    await page.getByRole("button", { name: /clear/i }).click();
    await expect(page.getByTestId("upload-dropzone")).toBeVisible();
  });

  test("paste single JD and add it", async ({ page }) => {
    const textarea = page.locator("textarea").first();
    await textarea.fill("Senior Full-Stack Engineer at Nexova...");
    // Actual button text is "+ Add job"
    await page.getByRole("button", { name: /add job/i }).click();

    // The JD card should appear
    await expect(page.getByText("Senior Full-Stack Engineer")).toBeVisible();
  });

  test("add multiple JDs up to 6, slot counter shows 0 remaining", async ({ page }) => {
    for (let i = 1; i <= 6; i++) {
      const textarea = page.locator("textarea").first();
      await textarea.fill(`Job description ${i}`);
      await page.getByRole("button", { name: /add job/i }).click();
    }

    // After 6 jobs, should show maximum reached message
    await expect(page.getByText(/maximum of 6/i)).toBeVisible();
  });

  test("remove a JD card", async ({ page }) => {
    // Add 2 jobs
    for (let i = 1; i <= 2; i++) {
      const textarea = page.locator("textarea").first();
      await textarea.fill(`Job description ${i}`);
      await page.getByRole("button", { name: /add job/i }).click();
    }

    // Remove job 1 (aria-label="Remove job 1")
    await page.getByRole("button", { name: "Remove job 1" }).click();

    // Should show 5 remaining
    await expect(page.getByText(/5 slots remaining/i)).toBeVisible();
  });

  test("empty JD submit is blocked — Add job button disabled", async ({ page }) => {
    const addBtn = page.getByRole("button", { name: /add job/i });
    await expect(addBtn).toBeDisabled();
  });

  test("Ctrl+Enter in JD textarea adds job", async ({ page }) => {
    const textarea = page.locator("textarea").first();
    await textarea.fill("Test JD via keyboard shortcut");
    await textarea.press("Control+Enter");

    // The JD card should appear
    await expect(page.getByText("Test JD via keyboard shortcut")).toBeVisible();
  });

  test("upload PDF + add JD enables Analyze button", async ({ page }) => {
    // Upload PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(PDF_PATH);

    // Add JD
    const textarea = page.locator("textarea").first();
    await textarea.fill("Some job description");
    await page.getByRole("button", { name: /add job/i }).click();

    // Analyze should be enabled
    const analyzeBtn = page.getByTestId("analyze-button");
    await expect(analyzeBtn).toBeEnabled();
  });
});
