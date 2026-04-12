# Resume Parser — Claude Code Guide

## Project Overview

A Next.js application toolkit for developers — upload a PDF resume and get a full battle plan: tiered gap analysis, tailored bullet rewrites, cover letter draft, study plan, and optional GitHub profile integration. Built on a multi-phase Claude API pipeline.

**Stack:** Next.js (App Router), TypeScript, Tailwind CSS
**Deployment:** Frontend on Vercel, API routes deployable via Railway
**Payments:** Stripe Checkout with Supabase token storage
**Auth:** Server-side Anthropic API key (no BYOK); $5 one-time token gate for paid phases

---

## Architecture

### Multi-Phase Claude Pipeline

1. **Extraction phase** (FREE) — Claude reads the PDF (base64-encoded) and returns structured `ResumeData`
2. **Scoring phase** (PAID) — Claude compares `ResumeData` + optional `GitHubProfile` against the job description and returns `MatchResult` with severity-tiered gaps
3. **Rewrite + Study phase** (PAID, parallel) — Claude generates bullet rewrites and a study plan
4. **Cover letter phase** (PAID) — Claude generates a tailored cover letter draft

Phases 1→2 are sequential. Phases 3–4 are non-blocking. In batch mode, Phase 1 runs once and Phase 2 runs in parallel for each JD.

### Token System

- Stripe Checkout creates a session → webhook mints a 4-use token in Supabase (one use per paid phase)
- Frontend polls `/api/redeem-token` after Stripe redirect to get the token
- Each paid route validates the token via `validateAndConsumeToken` (decrements `uses_remaining`)
- Demo mode bypasses all payment gates

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
| `app/api/extract/route.ts` | POST — Phase 1: PDF → `ResumeData` (free, no auth) |
| `app/api/score/route.ts` | POST — Phase 2: `ResumeData` + JD → `MatchResult` (token auth) |
| `app/api/rewrite/route.ts` | POST — Phase 3a: `ResumeData` + JD → `RewriteSuggestion[]` (token auth) |
| `app/api/study-plan/route.ts` | POST — Phase 3b: `MatchResult` + `ResumeData` → `StudyItem[]` (token auth) |
| `app/api/cover-letter/route.ts` | POST — Phase 4: `ResumeData` + `MatchResult` + JD → cover letter (token auth) |
| `app/api/github-profile/route.ts` | POST — GitHub username → `GitHubProfile` (public API, no auth) |
| `app/api/create-checkout/route.ts` | POST — creates Stripe Checkout session, returns URL |
| `app/api/webhook/route.ts` | POST — Stripe webhook: mints token on `checkout.session.completed` |
| `app/api/redeem-token/route.ts` | POST — frontend exchanges Stripe session ID for analysis token |
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
| `components/PayGate.tsx` | Payment gate after Phase 1 — triggers Stripe Checkout |

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

**POST `/api/extract`** — Phase 1 (free)

Body: `{ "resume": "<base64 PDF>" }`
Returns 400 if `resume` is missing.
Returns `ExtractResponse` (`{ resumeData: ResumeData }`).

**POST `/api/github-profile`** — Free

Body: `{ "username": "<github-username>" }`
Returns 400 if `username` is missing.
Returns 404 if GitHub user not found.
Returns `GitHubProfileResponse` (`{ profile: GitHubProfile }`).

---

### Token-Gated Routes (PAID — require `x-analysis-token` header)

All return 402 if `x-analysis-token` header is missing. All return 401 if token is invalid, expired, or exhausted.

**POST `/api/score`** — Phase 2

Body: `{ "resumeData": { ... }, "jobDescription": "<string>", "githubProfile"?: { ... } }`
Returns 400 if `resumeData` or `jobDescription` is missing.
Returns `ScoreResponse` (`{ matchResult: MatchResult }`).

**POST `/api/rewrite`** — Phase 3a

Body: `{ "resumeData": { ... }, "jobDescription": "<string>" }`
Returns 400 if either field is missing.
Returns `RewriteResponse` (`{ suggestions: RewriteSuggestion[] }`).

**POST `/api/study-plan`** — Phase 3b

Body: `{ "matchResult": { ... }, "resumeData": { ... } }`
Returns 400 if either field is missing.
Returns `StudyPlanResponse` (`{ items: StudyItem[] }`).

**POST `/api/cover-letter`** — Phase 4

Body: `{ "resumeData": { ... }, "matchResult": { ... }, "jobDescription": "<string>" }`
Returns 400 if any field is missing.
Returns `CoverLetterResponse` (`{ coverLetter: "<markdown string>" }`).

---

### Payment Routes

**POST `/api/create-checkout`** — No auth

Creates a Stripe Checkout session. Returns `{ url: "<stripe-checkout-url>" }`.

**POST `/api/webhook`** — Stripe signature verified

Stripe webhook endpoint. On `checkout.session.completed`: mints a 4-use analysis token in Supabase. Returns 400 if signature verification fails.

**POST `/api/redeem-token`** — No auth

Body: `{ "sessionId": "<stripe-session-id>" }`
Returns 400 if `sessionId` is missing.
Returns 404 if token not found for session.
Returns 410 if token already used or expired.
Returns `{ token: "<analysis-token>" }` on success.

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

**PayGate**
- Shown after Phase 1 completes if no analysis token is present
- Displays resume preview (name, skill count, experience count)
- Shows "$5 one-time" value prop with feature list
- CTA button triggers Stripe Checkout redirect
- `paymentState: 'pending'` shows spinner + "Verifying payment…"
- `paymentState: 'canceled'` shows retry button

**Page (app/page.tsx)**
- "Try Demo" button in header for instant demo mode
- Single JD / Batch Mode toggle above JD panel
- Analyze button disabled until both resume and JD are provided
- Phase 1 runs free without token; PayGate appears after completion
- Phases 2–4 require `x-analysis-token` header
- Phases 3–4 are non-blocking — earlier results preserved on failure
- Batch mode: extract once, score all JDs in parallel, render sortable table
- URL param handling for Stripe redirect (`?token=...&success=true` or `?canceled=true`)
- Demo mode populates all features with canned fixtures — no payment UI rendered

---

## Commit Convention

```
feat: short description
fix: short description
chore: short description
docs: short description
```

No ticket numbers needed. Keep messages short and imperative.
