# Resume Parser — Claude Code Guide

## Project Overview

A Next.js application toolkit for developers — upload a PDF resume and get a full battle plan: tiered gap analysis, tailored bullet rewrites, cover letter draft, study plan, and optional GitHub + LinkedIn profile integration. Built on a multi-phase Claude API pipeline.

**Stack:** Next.js (App Router), TypeScript, Tailwind CSS
**Deployment:** Frontend on Vercel, API routes deployable via Railway
**Payments:** Stripe Checkout with Supabase token storage
**Auth:** Server-side Anthropic API key (no BYOK); $5 one-time token gate for paid phases

---

## Architecture

### Multi-Phase Claude Pipeline

1. **Extraction phase** (FREE) — Claude reads the PDF (base64-encoded) and returns structured `ResumeData`
2. **Scoring phase** (FREE) — Claude compares `ResumeData` + optional `GitHubProfile` / `LinkedInProfile` against the JD and returns `MatchResult` with severity-tiered gaps
3. **Rewrite + Study phase** (PAID, parallel) — Claude generates bullet rewrites and a study plan
4. **Cover letter phase** (PAID, streaming) — Claude streams a tailored cover letter draft (≤300 words, hard-capped at 500 tokens)

Phases 1→2 are sequential. Phases 3–4 are non-blocking. In batch mode, Phase 1 runs once and Phase 2 runs in parallel for each JD (all free).

### Token System

- Stripe Checkout creates a session → webhook mints a **3-use** token in Supabase (one use per paid phase: rewrite, study plan, cover letter)
- Frontend polls `/api/redeem-token` after Stripe redirect to get the token
- Each paid route validates the token via `validateAndConsumeToken` (decrements `uses_remaining`)
- `/api/score` requires **no token** — scoring is always free
- Demo mode bypasses all payment gates

### SessionStorage Keys (cross-redirect state)

| Key | Value |
|---|---|
| `pending_resume_data` | JSON `ResumeData` — preserved across Stripe redirect |
| `pending_resume_name` | String — resume filename for post-redirect display |
| `pending_jds` | JSON `string[]` — all job descriptions |
| `pending_match_result` | JSON `MatchResult` — preserved so score is visible on return |
| `pending_github_profile` | JSON `GitHubProfile \| null` |
| `pending_linkedin_profile` | JSON `LinkedInProfile \| null` |
| `pending_stripe_session` | Stripe session ID for token redemption |

### Key Files

| Path | Purpose |
|---|---|
| `lib/types.ts` | All shared TypeScript interfaces |
| `lib/extractPdfText.ts` | Converts File → base64 for Anthropic document input |
| `lib/demoData.ts` | Demo fixtures for all features (resume, match, rewrites, study, cover letter) |
| `lib/anthropic.ts` | Server-side Anthropic client singleton |
| `lib/stripe.ts` | Server-side Stripe client singleton |
| `lib/supabaseAdmin.ts` | Supabase service-role client for token writes |
| `lib/tokens.ts` | Token generation, minting, and `validateAndConsumeToken` |
| `app/api/extract/route.ts` | POST — Phase 1: PDF → `ResumeData` (free) |
| `app/api/score/route.ts` | POST — Phase 2: `ResumeData` + JD → `MatchResult` (**free, no auth**) |
| `app/api/rewrite/route.ts` | POST — Phase 3a: `ResumeData` + JD → `RewriteSuggestion[]` (token auth) |
| `app/api/study-plan/route.ts` | POST — Phase 3b: `MatchResult` + `ResumeData` → `StudyItem[]` (token auth) |
| `app/api/cover-letter/route.ts` | POST — Phase 4: streaming plain-text cover letter (token auth, `maxDuration=60`) |
| `app/api/github-profile/route.ts` | POST — GitHub username → `GitHubProfile` (public API, no auth) |
| `app/api/linkedin-profile/route.ts` | POST — pasted LinkedIn text → `LinkedInProfile` via Claude (free) |
| `app/api/create-checkout/route.ts` | POST — creates Stripe Checkout session, returns URL |
| `app/api/webhook/route.ts` | POST — Stripe webhook: mints token on `checkout.session.completed` |
| `app/api/redeem-token/route.ts` | POST — frontend exchanges Stripe session ID for analysis token |
| `app/app/page.tsx` (→ `AppExperience`) | Pipeline orchestration, layout, state management |
| `components/AppExperience.tsx` | All app state, phase logic, layout split, tabs, sessionStorage |
| `components/ResumeUpload.tsx` | PDF drag-and-drop; shows "restored from session" after redirect |
| `components/JobDescriptionList.tsx` | Card-based JD input (up to 6 JDs, one at a time) |
| `components/GitHubConnect.tsx` | GitHub username input with profile preview card |
| `components/LinkedInConnect.tsx` | Paste-based LinkedIn profile extraction (3-step flow) |
| `components/ResumeProfile.tsx` | Structured resume output with skeleton loader |
| `components/MatchScore.tsx` | Score display with severity-tiered gap sections |
| `components/ResumeRewriter.tsx` | Before/after bullet rewrite suggestions |
| `components/StudyPlan.tsx` | Actionable study recommendations per gap |
| `components/CoverLetter.tsx` | Streaming cover letter with "writing…" indicator + copy button |
| `components/BatchResults.tsx` | Sortable batch results table with drill-down |
| `components/PayGate.tsx` | Payment gate — shows score %, unlocks rewrites/study/cover letter |

### TypeScript Interfaces (lib/types.ts)

**Core data:**
- `ResumeData` — extracted candidate info (name, summary, skills, experience, education)
- `MatchResult` — score (0–100), matched skills, `MissingSkill[]` with severity, recommendation
- `MissingSkill` — `{ skill, severity: "dealbreaker" | "learnable" | "soft", reason }`
- `GapSeverity` — union type `"dealbreaker" | "learnable" | "soft"`

**Profile enrichment:**
- `GitHubProfile` — username, bio, publicRepos, followers, topLanguages, repos
- `GitHubRepo` — name, description, language, stars, url
- `LinkedInProfile` — name, headline, currentRole, currentCompany, skills[], summary
- `LinkedInProfileResponse` — `{ profile: LinkedInProfile }`

**Feature types:**
- `RewriteSuggestion` — original role/bullet, rewritten bullet, rationale
- `StudyItem` — skill, severity, action (1-2 sentence recommendation), resource (specific link/name)
- `CoverLetterRequest` — resumeData + matchResult + JD + optional githubProfile + linkedinProfile
- `ScoreRequest` — resumeData + jobDescription + optional githubProfile + linkedinProfile
- `BatchScoreResult` — jobTitle, company, score, matchedSkills, topGaps, recommendation, JD

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | `.env.local` + Vercel | Claude API calls (server-side only) |
| `STRIPE_SECRET_KEY` | `.env.local` + Vercel | Stripe API calls (server-side only) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `.env.local` + Vercel | Stripe public key (exposed to frontend) |
| `STRIPE_PRICE_ID` | `.env.local` + Vercel | Stripe one-time price ID |
| `STRIPE_WEBHOOK_SECRET` | `.env.local` + Vercel | Stripe webhook signature verification |
| `SUPABASE_URL` | `.env.local` + Vercel | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` + Vercel | Supabase service role (server-side token writes) |
| `NEXT_PUBLIC_GITHUB_URL` | `.env.local` + Vercel | Optional repo link in app footer |

Always keep `.env.local` out of git. Use `.env.example` to document required vars without values.

---

## API Route Contract

### Free Routes (no auth)

**POST `/api/extract`** — Phase 1

Body: `{ "resume": "<base64 PDF>" }`
Returns 400 if `resume` is missing.
Returns `ExtractResponse` (`{ resumeData: ResumeData }`).

**POST `/api/score`** — Phase 2 (**free — no token required**)

Body: `{ "resumeData": { ... }, "jobDescription": "<string>", "githubProfile"?: { ... }, "linkedinProfile"?: { ... } }`
Returns 400 if `resumeData` or `jobDescription` is missing.
Returns `ScoreResponse` (`{ matchResult: MatchResult }`).

**POST `/api/github-profile`** — Free

Body: `{ "username": "<github-username>" }`
Returns 400 if `username` is missing. Returns 404 if user not found.
Returns `GitHubProfileResponse` (`{ profile: GitHubProfile }`).

**POST `/api/linkedin-profile`** — Free

Body: `{ "profileText": "<raw pasted LinkedIn page text>" }`
Returns 400 if `profileText` is missing.
Returns `LinkedInProfileResponse` (`{ profile: LinkedInProfile }`).

---

### Token-Gated Routes (PAID — require `x-analysis-token` header)

All return 402 if `x-analysis-token` header is missing. All return 401 if token is invalid, expired, or exhausted.

**POST `/api/rewrite`** — Phase 3a

Body: `{ "resumeData": { ... }, "jobDescription": "<string>", "linkedinProfile"?: { ... } }`
Returns 400 if `resumeData` or `jobDescription` is missing.
Returns `RewriteResponse` (`{ suggestions: RewriteSuggestion[] }`).

**POST `/api/study-plan`** — Phase 3b

Body: `{ "matchResult": { ... }, "resumeData": { ... }, "linkedinProfile"?: { ... } }`
Returns 400 if `matchResult` or `resumeData` is missing.
Returns `StudyPlanResponse` (`{ items: StudyItem[] }`).

**POST `/api/cover-letter`** — Phase 4 (**streaming**)

Body: `{ "resumeData": { ... }, "matchResult": { ... }, "jobDescription": "<string>", "linkedinProfile"?: { ... } }`
Returns 400 if `resumeData`, `matchResult`, or `jobDescription` is missing.
Returns `text/plain` stream (not JSON). Read with `response.body.getReader()`.
Hard-capped at 300 words / 500 tokens. `maxDuration = 60`.

---

### Payment Routes

**POST `/api/create-checkout`** — No auth

Creates a Stripe Checkout session. Returns `{ url: "<stripe-checkout-url>" }`.

**POST `/api/webhook`** — Stripe signature verified

On `checkout.session.completed`: mints a **3-use** analysis token in Supabase (rewrite, study plan, cover letter). Returns 400 if signature verification fails.

**POST `/api/redeem-token`** — No auth

Body: `{ "sessionId": "<stripe-session-id>" }`
Returns 400/404/410 on error. Returns `{ token: "<analysis-token>" }` on success.

---

## Component Behavior

**AppExperience**
- Central orchestrator: all pipeline state, phase logic, layout switching
- Pre-analysis: `panel-grid` (left column: Upload + GitHub + LinkedIn; right column: JobDescriptionList)
- Post-analysis: `workspace-results` CSS grid (360px sticky sidebar + 1fr main content)
- Sidebar shows: `MatchScore` + `PayGate` (if unpaid) + session summary card
- Main area: `BatchResults` table (multi-JD) OR tabbed panel (rewrites / study / cover letter)
- `resetWorkspace()` clears all state and returns to input view
- Auto-trigger effect: when `analysisToken` arrives and `matchResult` + `resumeData` exist, fires `runPaidPhases` automatically

**ResumeUpload**
- Accepts PDF only via click or drag-and-drop; rejects non-PDF with inline error
- Shows filename after selection; clear button resets
- `sessionResumeName` prop: when no file but name provided, shows "restored from session" chip instead of upload prompt

**JobDescriptionList**
- One textarea at a time; "Add job" appends to list (Cmd/Ctrl+Enter shortcut)
- Each JD becomes a card showing truncated first line + remove button
- Max 6 JDs; textarea hidden when limit reached
- No internal submission — parent drives analysis via Analyze button

**GitHubConnect**
- Username text input with Connect/Clear button
- Fetches profile on submit, shows preview card with bio, languages, top repos
- Passes `GitHubProfile` to parent via `onProfile` callback

**LinkedInConnect**
- 3-step paste flow: URL validation → paste instructions + textarea → parsed profile card
- Step 2 shows instructions to open LinkedIn, Ctrl+A, copy, paste
- POSTs raw text to `/api/linkedin-profile`; shows parsed headline, company, top 6 skills as pills
- Passes `LinkedInProfile` to parent via `onProfile` callback

**MatchScore**
- Score color: green ≥80%, amber 60–79%, red <60%
- Missing skills in three severity sections (🔴 dealbreaker, 🟡 learnable, 🟢 soft) with per-item reasons
- Shows skeleton loader during scoring phase

**PayGate**
- Shown after scoring if no `analysisToken` is present
- Header: `"{score}% match — unlock the full battle plan"`
- Paid features: bullet rewrites, study plan, cover letter (score is already visible for free)
- `paymentState: 'pending'` shows spinner; `paymentState: 'canceled'` shows retry

**CoverLetter**
- `loading && !content`: full skeleton (pre-stream)
- `loading && content`: content visible with pulsing "writing…" eyebrow (streaming in progress)
- Copy button disabled while loading; footer disclaimer hidden until complete

**BatchResults**
- Sortable table (score, company, title) with score bar visualization
- Top gaps as colored pills per row
- Drill-down: click row → sets `jobDescriptions = [that JD]`, clears paid content, re-runs paid phases if token exists

---

## Layout System (globals.css)

- `--max-w-content: 1440px` — wide viewport support
- `.workspace-results`: `grid-template-columns: 360px 1fr` — post-analysis split layout
- `.workspace-sidebar`: sticky at `top: 72px`, scrollable with hidden scrollbar
- `.result-tabs` / `.result-tab` / `.result-tab--active`: mono uppercase tab bar, teal active underline
- Breakpoints: 1100px (sidebar narrows to 300px), 960px (collapses to single column), 720px, 480px

---

## Commit Convention

```
feat: short description
fix: short description
chore: short description
docs: short description
```

No ticket numbers needed. Keep messages short and imperative.
