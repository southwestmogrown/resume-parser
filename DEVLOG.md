# DEVLOG — Resume Parser

## 2026-03-19 — M1: Foundation

### Scaffold (#1)
Initialized a Next.js 16 (App Router) project with TypeScript, Tailwind CSS v4, and ESLint into the existing repo directory. Next.js 16 ships with Tailwind v4, which dropped `tailwind.config.ts` as the runtime config in favor of CSS-native `@theme` blocks. Brand colors were registered both in `tailwind.config.ts` (for documentation/compat) and via CSS custom properties in `src/app/globals.css` (the v4 path that actually gets picked up at build time).

Folder structure established:
- `src/app/` — App Router pages and API routes
- `src/components/` — UI components
- `src/lib/` — shared utilities and types

`.env.example` and `.env.local` scaffolded with `ANTHROPIC_API_KEY` and `ACCESS_KEY` placeholders.

### TypeScript Types (#2)
Created `src/lib/types.ts` with all shared interfaces:
- `ResumeData` — extracted candidate info (name, summary, skills, experience, education)
- `ExperienceEntry` / `EducationEntry` — nested types for the above
- `MatchResult` — score (0–100), matched skills, missing skills, recommendation
- `AnalysisRequest` — base64 resume + job description string
- `AnalysisResponse` — combined ResumeData + MatchResult

### PDF Utility (#3)
Created `src/lib/extractPdfText.ts` exporting `extractPdfBase64(file: File): Promise<string>`. Uses the browser's `FileReader` API to read the file as a data URL, then strips the `data:application/pdf;base64,` prefix. Claude's API accepts PDF natively as a document input — no PDF parsing library needed.

### API Route (#4)
Created `src/app/api/analyze/route.ts` — POST handler with:
- `x-access-key` header gate (401 if missing or wrong)
- 400 validation for missing `resume` or `jobDescription` fields
- **Phase 1:** Claude `claude-sonnet-4-6` call with the PDF as a `document` input — returns structured `ResumeData` JSON
- **Phase 2:** Claude `claude-sonnet-4-6` call comparing extracted resume data against the job description — returns `MatchResult` JSON
- `@anthropic-ai/sdk` installed

Branch `feat/m1-foundation` pushed to GitHub.

---

## 2026-03-19 — M2: UI & Analysis

### ResumeUpload (#5)
Created `src/components/ResumeUpload.tsx` — client component with drag-and-drop PDF upload. Accepts PDF via click or drag, rejects non-PDFs with an inline error, shows filename after selection, and exposes a clear button. Calls `onChange` with the `File` object.

### JobDescription (#6)
Created `src/components/JobDescription.tsx` — client component with an auto-filling textarea, live character count, and a conditional clear button. Calls `onChange` with the current string value.

### ResumeProfile (#7)
Created `src/components/ResumeProfile.tsx` — displays extracted `ResumeData`: candidate name, summary, skills as pills, experience timeline, and education entries. Renders a pulsing skeleton that matches component dimensions while extraction is in progress. Returns `null` when neither loading nor data is present.

### MatchScore (#8)
Created `src/components/MatchScore.tsx` — displays `MatchResult`: large percentage score color-coded by threshold (green ≥80%, amber 60–79%, red <60%), matched skills in green pills, missing skills in red pills, and a recommendation paragraph. Renders a skeleton while scoring is in progress.

### Page Assembly (#9)
Replaced the scaffold `app/page.tsx` with the full application page. Two-column input layout (ResumeUpload + JobDescription), Analyze button disabled until both inputs are populated, two-phase pipeline (PDF → base64 → POST `/api/analyze` → set extraction result → set score result). Output panels hidden until first analysis completes. Error displayed inline below the button.

Also updated:
- `globals.css` — simplified to a single dark background, removed light-mode `:root` and media query bleed
- `layout.tsx` — page title set to "Resume Parser — Shane Wilkey"

**Note:** `NEXT_PUBLIC_ACCESS_KEY` must be added to `.env.local` (client-side header send) alongside the existing `ACCESS_KEY` (server-side validation).

Branch `feat/m2-ui-analysis` pushed to GitHub.

---
