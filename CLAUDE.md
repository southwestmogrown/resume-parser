# Resume Parser — Claude Code Guide

## Project Overview

A Next.js application toolkit for developers — upload a PDF resume and get a full battle plan: tiered gap analysis, tailored bullet rewrites, cover letter draft, study plan, and optional GitHub profile integration. Built on a multi-phase Claude API pipeline.

**Stack:** Next.js (App Router), TypeScript, Tailwind CSS
**Deployment:** Frontend on Vercel, API routes deployable via Railway
**Auth:** Session-based BYOK gate (sessionStorage + API key header)

---

## Architecture

### Multi-Phase Claude Pipeline

1. **Extraction phase** — Claude reads the PDF (base64-encoded) and returns structured `ResumeData`
2. **Scoring phase** — Claude compares `ResumeData` + optional `GitHubProfile` against the job description and returns `MatchResult` with severity-tiered gaps
3. **Rewrite + Study phase** (parallel) — Claude generates bullet rewrites and a study plan
4. **Cover letter phase** — Claude generates a tailored cover letter draft

Phases 1→2 are sequential. Phases 3–4 are non-blocking. In batch mode, Phase 1 runs once and Phase 2 runs in parallel for each JD.

### Key Files

| Path | Purpose |
|---|---|
| `lib/types.ts` | All shared TypeScript interfaces |
| `lib/extractPdfText.ts` | Converts File → base64 for Anthropic document input |
| `lib/demoData.ts` | Demo fixtures for all features (resume, match, rewrites, study, cover letter) |
| `app/api/extract/route.ts` | POST — Phase 1: PDF → `ResumeData` |
| `app/api/score/route.ts` | POST — Phase 2: `ResumeData` + JD → `MatchResult` (tiered gaps) |
| `app/api/rewrite/route.ts` | POST — Phase 3a: `ResumeData` + JD → `RewriteSuggestion[]` |
| `app/api/study-plan/route.ts` | POST — Phase 3b: `MatchResult` + `ResumeData` → `StudyItem[]` |
| `app/api/cover-letter/route.ts` | POST — Phase 4: `ResumeData` + `MatchResult` + JD → cover letter |
| `app/api/github-profile/route.ts` | POST — GitHub username → `GitHubProfile` (public API, no auth) |
| `app/page.tsx` | Main page — state, pipeline orchestration, single/batch mode |
| `components/ResumeUpload.tsx` | PDF drag-and-drop input |
| `components/JobDescription.tsx` | Job description textarea input |
| `components/GitHubConnect.tsx` | GitHub username input with profile preview card |
| `components/BatchJobDescriptions.tsx` | Multi-JD textarea with `---` separator |
| `components/ResumeProfile.tsx` | Structured resume output with skeleton loader |
| `components/MatchScore.tsx` | Score display with severity-tiered gap sections |
| `components/ResumeRewriter.tsx` | Before/after bullet rewrite suggestions |
| `components/StudyPlan.tsx` | Actionable study recommendations per gap |
| `components/CoverLetter.tsx` | Cover letter display with copy-to-clipboard |
| `components/BatchResults.tsx` | Sortable batch results table with drill-down |

### TypeScript Interfaces (lib/types.ts)

**Core data:**
- `ResumeData` — extracted candidate info (name, summary, skills, experience, education)
- `MatchResult` — score (0–100), matched skills, `MissingSkill[]` with severity, recommendation
- `MissingSkill` — `{ skill, severity: "dealbreaker" | "learnable" | "soft", reason }`
- `GapSeverity` — union type `"dealbreaker" | "learnable" | "soft"`

**Feature types:**
- `RewriteSuggestion` — original role/bullet, rewritten bullet, rationale
- `StudyItem` — skill, severity, action (1-2 sentence recommendation), resource (specific link/name)
- `CoverLetterRequest/Response` — resumeData + matchResult + JD → markdown string
- `GitHubProfile` — username, bio, publicRepos, followers, topLanguages, repos
- `GitHubRepo` — name, description, language, stars, url
- `BatchScoreResult` — jobTitle, company, score, matchedSkills, topGaps, recommendation, JD

**Route shapes:**
- `ExtractRequest/Response` — base64 PDF → ResumeData
- `ScoreRequest/Response` — ResumeData + JD → MatchResult
- `RewriteRequest/Response` — ResumeData + JD → RewriteSuggestion[]
- `StudyPlanRequest/Response` — MatchResult + ResumeData → StudyItem[]

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | `.env.local` + Vercel | Claude API calls (BYOK model — users supply at runtime) |
| `NEXT_PUBLIC_GITHUB_URL` | `.env.local` + Vercel | Optional repo link in key gate modal |

Always keep `.env.local` out of git. Use `.env.example` to document required vars without values.

---

## API Route Contract

All Claude-powered routes require `x-api-key` header. All return 401 if missing/invalid.

**POST `/api/extract`** — Phase 1

Body: `{ "resume": "<base64 PDF>" }`
Returns 400 if `resume` is missing.
Returns `ExtractResponse` (`{ resumeData: ResumeData }`).

---

**POST `/api/score`** — Phase 2

Body: `{ "resumeData": { ... }, "jobDescription": "<string>", "githubProfile"?: { ... } }`
Returns 400 if `resumeData` or `jobDescription` is missing.
Returns `ScoreResponse` (`{ matchResult: MatchResult }`).
`MatchResult.missingSkills` is `MissingSkill[]` (each has `skill`, `severity`, `reason`).

---

**POST `/api/rewrite`** — Phase 3a

Body: `{ "resumeData": { ... }, "jobDescription": "<string>" }`
Returns 400 if either field is missing.
Returns `RewriteResponse` (`{ suggestions: RewriteSuggestion[] }`).

---

**POST `/api/study-plan`** — Phase 3b

Body: `{ "matchResult": { ... }, "resumeData": { ... } }`
Returns 400 if either field is missing.
Returns `StudyPlanResponse` (`{ items: StudyItem[] }`).

---

**POST `/api/cover-letter`** — Phase 4

Body: `{ "resumeData": { ... }, "matchResult": { ... }, "jobDescription": "<string>" }`
Returns 400 if any field is missing.
Returns `CoverLetterResponse` (`{ coverLetter: "<markdown string>" }`).

---

**POST `/api/github-profile`** — No API key required

Body: `{ "username": "<github-username>" }`
Returns 400 if `username` is missing.
Returns 404 if GitHub user not found.
Returns `GitHubProfileResponse` (`{ profile: GitHubProfile }`).

---

## Component Behavior

**ResumeUpload**
- Accepts PDF only via click or drag-and-drop
- Rejects non-PDF with inline error
- Shows filename after selection; clear button resets

**JobDescription**
- Auto-expanding textarea
- Live character count

**GitHubConnect**
- Username text input with Connect/Clear button
- Fetches profile on submit, shows preview card with bio, languages, top repos
- Passes `GitHubProfile` to parent via `onProfile` callback

**BatchJobDescriptions**
- Textarea for multiple JDs separated by `---`
- Live count of detected JDs
- Submit button triggers batch scoring

**ResumeProfile**
- Skills render as pills
- Shows skeleton loader during extraction phase
- Renders nothing if no data yet

**MatchScore**
- Score color: green ≥80%, amber 60–79%, red <60%
- Missing skills rendered in three severity sections (🔴 dealbreaker, 🟡 learnable, 🟢 soft) with per-item reason text
- Shows skeleton loader during scoring phase

**ResumeRewriter**
- Renders each experience entry as original → rewritten diff
- Copy button per rewrite, rationale text below each
- Shows skeleton loader during rewrite phase

**StudyPlan**
- Renders each learnable/soft gap as a card with action text and resource link
- Color-coded by severity tier
- Shows skeleton loader during study plan phase

**CoverLetter**
- Renders markdown content with bold text support
- Copy-to-clipboard button
- Shows skeleton loader during cover letter phase

**BatchResults**
- Sortable table (by score, company, title) with score bar visualization
- Top gaps shown as colored pills per row
- Click any row to drill down — switches to single mode with that JD pre-loaded

**Page (app/page.tsx)**
- Single JD / Batch Mode toggle above JD panel
- Analyze button disabled until both resume and JD are provided
- 4-phase progressive loading: extract → score → (rewrites + study plan) → cover letter
- Phases 3–4 are non-blocking — earlier results preserved on failure
- Batch mode: extract once, score all JDs in parallel, render sortable table
- Demo mode populates all features with canned fixtures
- Errors displayed inline if API call fails

---

## Access Key Gate

Frontend modal shown on first visit. Users enter their Anthropic API key (BYOK model). Key stored in `sessionStorage` for the session. Wrong key shows error and prompts re-entry. All fetch calls include the key as `x-api-key` header. Demo mode bypasses the gate with pre-loaded fixtures.

---

## Milestones

| Milestone | Scope |
|---|---|
| M1 — Foundation | Scaffold, types, PDF utility, API route |
| M2 — UI & Analysis | All components + page assembly |
| M3 — Polish & Ship | Key gate UI, polish pass, README, deploy |
| M4 — Application Toolkit | Gap tiers, bullet rewrites, cover letter, study plan, GitHub integration, batch mode |

---

## Commit Convention

```
feat: short description
fix: short description
chore: short description
docs: short description
```

No ticket numbers needed. Keep messages short and imperative.
