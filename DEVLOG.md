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
