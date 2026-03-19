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

## 2026-03-19 — M3: Polish & Ship

### Access Key Gate (#10)
Created `src/components/AccessKeyGate.tsx` — a client component that wraps the entire app with a modal passphrase prompt. On mount it checks `sessionStorage` for a previously stored key and auto-unlocks. Validates the key by probing `POST /api/analyze` with an empty body: a `400` (field validation error) means the key was accepted, `401` means wrong key. Accepted key stored in `sessionStorage` under `resume-parser-access-key`. Updated `page.tsx` to pass the key via `onKey` callback into component state, replacing the previous `NEXT_PUBLIC_ACCESS_KEY` env var approach.

### Polish Pass (#11)
- `src/components/Spinner.tsx` — inline SVG spinner using `animate-spin`, shown inside the Analyze button while either pipeline phase is running
- `src/components/ErrorBoundary.tsx` — React class component with `getDerivedStateFromError`, renders a branded error panel with a "Try again" reset button
- `page.tsx` updated to wrap the full page tree in `ErrorBoundary > AccessKeyGate`, and the Analyze button now renders the spinner alongside the "Analyzing…" label

### README (#12)
Wrote complete `README.md` covering: what the app does, how the two-phase Claude pipeline works, tech stack, local setup steps, environment variable documentation, access key instructions, and project structure map.

Branch `feat/m3-polish-ship` pushed to GitHub.

---

## 2026-03-19 — Code Review Fixes (Round 1)

Bug-fix pass following first code review.

### route.ts — Unhandled Claude API errors
Wrapped both `client.messages.create()` calls in `extract/route.ts` and `score/route.ts` in try/catch. Previously, any Anthropic API error (rate limit, network timeout, invalid key) caused Next.js to return an HTML 500 page instead of a JSON error. Each catch now returns a scoped JSON 500 with a descriptive message.

### route.ts — Fragile JSON.parse on Claude responses
Claude occasionally wraps JSON output in ` ```json ``` ` fences despite being instructed not to. Added fence-stripping before both `JSON.parse()` calls in each route: `text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()`.

### AccessKeyGate.tsx — Network failure leaves button stuck
The `fetch` probe in `handleSubmit` had no try/catch. A network error would throw past `setLoading(false)`, freezing the button in "Verifying…" indefinitely. Wrapped the fetch in try/catch; the catch block resets loading state and surfaces a "Could not reach the server" error message.

### Minor fixes
- `ResumeUpload.tsx` — error color changed from raw `text-red-400` to design-system token `text-brand-red`
- `MatchScore.tsx` / `ResumeProfile.tsx` — skill pill list keys changed from skill string to index, preventing React key warnings on duplicate skill names returned by Claude
- `AccessKeyGate.tsx` — removed `onKey` from `useEffect` dependency array (stable React setter; omission documented with eslint-disable comment)

---

## 2026-03-19 — Progressive Reveal Refactor

Addressed the false progressive reveal identified in code review: `loadingExtraction` and `loadingScore` were aliases for the same event (one fetch), so both panels always appeared simultaneously.

### Approach: Split `/api/analyze` into two independent routes

- `src/app/api/extract/route.ts` — Phase 1 only: accepts base64 PDF, returns `ExtractResponse ({ resumeData })`
- `src/app/api/score/route.ts` — Phase 2 only: accepts `ResumeData` + job description, returns `ScoreResponse ({ matchResult })`
- `src/app/api/analyze/route.ts` — deleted
- `src/lib/types.ts` — added `ExtractRequest/Response` and `ScoreRequest/Response`
- `src/app/page.tsx` — `handleAnalyze` split into two sequential fetches; Phase 1 success sets `resumeData` and clears `loadingExtraction`; Phase 2 success sets `matchResult` and clears `loadingScore`; Phase 1 failure aborts early; Phase 2 failure preserves already-populated `ResumeProfile`
- `CLAUDE.md` — Key Files table and API Route Contract updated

`ResumeProfile` now genuinely populates before `MatchScore`.

---

## 2026-03-19 — Code Review Fixes (Round 2)

Bug-fix pass following second code review. Three issues introduced by the route split.

### AccessKeyGate.tsx — Probe targeting deleted route (critical)
The key validation probe was still calling `POST /api/analyze`, which was deleted. A `404` is not a `401`, so the gate was treating every key as valid — access control was completely bypassed. Fixed by retargeting the probe to `POST /api/extract` with `{ resume: "" }`.

### page.tsx — `loadingScore` set too early
`setLoadingScore(true)` was called at the top of `handleAnalyze` alongside `setLoadingExtraction(true)`, causing the `MatchScore` skeleton to appear immediately on button click rather than after Phase 1 completes. Moved `setLoadingScore(true)` to immediately after `setLoadingExtraction(false)`, just before the Phase 2 fetch begins.

### types.ts — Dead code removed
`AnalysisRequest` and `AnalysisResponse` were left in `types.ts` after `/api/analyze` was deleted. Removed both interfaces.

---

## 2026-03-19 — Code Review Fixes (Round 3)

### AccessKeyGate.tsx — Non-401 server errors unlocked the gate
The probe validation only rejected `401` responses. Any other non-success status (e.g. `500` from a misconfigured server or Claude being down) fell through to `setUnlocked(true)`, admitting users without a valid key. Added an explicit guard: only a `400` (key accepted, fields missing) proceeds to unlock. Any other status surfaces "Unexpected server error. Try again later."

---
