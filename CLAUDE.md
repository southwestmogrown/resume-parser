# Resume Parser — Claude Code Guide

## Project Overview

A Next.js application toolkit for developers — upload a PDF resume and get a full battle plan: tiered gap analysis, tailored bullet rewrites, cover letter draft, study plan, behavioral interview coaching, and optional GitHub + LinkedIn profile integration. Built on a multi-phase Claude API pipeline.

**Stack:** Next.js (App Router), TypeScript, Tailwind CSS
**Deployment:** Frontend on Vercel, API routes deployable via Railway
**Payments:** Stripe PaymentElement (in-app modal) with Supabase token storage
**Auth:** Server-side Anthropic API key (no BYOK); $5 one-time token gate for paid phases

---

## Architecture

### Multi-Phase Claude Pipeline

- **Phase 0 — Experience Interviewer** (FREE, optional) — Multi-turn chat that surfaces concrete impact metrics and hidden skills from the user's actual experience. Produces an `InterviewBrief` that is merged into `ResumeData` before scoring via `mergeEnrichedResume`. Runs before Phase 1 scoring; skip anytime.
1. **Extraction phase** (FREE) — Claude reads the PDF (base64-encoded) and returns structured `ResumeData`
2. **Scoring phase** (FREE) — Claude compares `ResumeData` + optional `GitHubProfile` / `LinkedInProfile` against the JD and returns `MatchResult` with severity-tiered gaps
3. **Rewrite + Study phase** (PAID, parallel) — Claude generates bullet rewrites and a study plan
4. **Cover letter phase** (PAID, streaming) — Claude streams a cover letter draft OR a "do not apply" redirect if dealbreakers exist (≤300 words, hard-capped at 500 tokens)
- **Phase 5 — STAR Prep** (PAID) — Converts gap analysis into coached behavioral interview prep. Generates tailored `StarQuestion[]` then coaches the user through building STAR-format answers question by question. Fourth tab in the results panel.

Phases 1→2 are sequential. Phases 3–4 are non-blocking. In batch mode, Phase 1 runs once and Phase 2 runs in parallel for each JD (all free).

### Token System

- Clicking Unlock opens `CheckoutModal` → fetches `/api/create-payment-intent` → clientSecret returned
- User enters card in Stripe `PaymentElement` → `stripe.confirmPayment({ redirect: 'if_required' })`
- On success: `POST /api/mint-from-payment-intent` verifies PaymentIntent status and mints a **4-use** token
- Token stored in Supabase `analysis_tokens` table (one use per paid phase: rewrite, study plan, cover letter, STAR prep first turn)
- Each paid route validates the token via `validateAndConsumeToken` (decrements `uses_remaining`)
- **STAR prep access model**: STAR prep costs **one token use total**. `checkStarPrepAccess(token)` returns `'consume'` (first activation — decrement + set `star_prep_unlocked = true`), `'allow'` (already unlocked — check expiry only, ignore `uses_remaining`), or `'deny'`. Once unlocked, users can work through all questions at their own pace across multiple sessions within the token window. Requires `star_prep_unlocked boolean NOT NULL DEFAULT false` column on `analysis_tokens`.
- `validateTokenOnly(token)` in `lib/tokens.ts` — validates `uses_remaining > 0` + not expired without decrementing; used by rewrite/study/cover for idempotency checks if needed
- `/api/score` and `/api/interview` require **no token** — scoring and experience interviewing are always free
- On 401/402 from any paid route, `runPaidPhases` calls `handleTokenInvalid()` which clears `analysisToken` state and resets `paymentState` to `"idle"` — this breaks any retry loop and restores the PayGate
- Demo mode (`?demo` URL param) bypasses all payment gates — see Demo Mode section
- Legacy: `/api/create-checkout` + `/api/webhook` + `/api/redeem-token` support the Stripe Checkout redirect flow (kept but not the primary path)

### Prompt Contract — Phase 2 Recommendation Format

`MatchResult.recommendation` must begin with one of these machine-readable tags:

```
STRONG_FIT — <2-3 sentences of reasoning>
GOOD_FIT — <2-3 sentences>
STRETCH — <2-3 sentences>
DO_NOT_APPLY — <2-3 sentences>
```

`MatchScore.tsx` parses this prefix and renders it as a `SeverityPill` badge (green/sage/amber/red). The prose is displayed below. Do not change this format without updating both the score route prompt and `MatchScore.tsx`.

### Prompt Contract — Cover Letter Dealbreaker Guard

`/api/cover-letter` enforces a dealbreaker block at **two layers**:
1. **Route level (422)**: If `matchResult.missingSkills` contains any `severity === "dealbreaker"` entries, the route returns 422 before calling Claude. Body: `{ error, dealbreakers: string[] }`.
2. **Prompt level**: The Claude prompt includes an explicit guard instructing it to refuse and suggest alternative role types if dealbreakers exist.

On 422, the frontend sets `coverLetterBlocked` state (the `dealbreakers` string array from the response body). `CoverLetter` renders an explanation card listing the blocking skills — the tab is never silently empty.

### Demo Mode

`/app?demo` pre-loads all `DEMO_*` fixtures from `lib/demoData.ts` and sets `analysisToken` to `"demo"`, bypassing the payment gate. localStorage restore and persist are both skipped in demo mode to avoid polluting saved state. Triggered via `useState(() => new URLSearchParams(window.location.search).has("demo"))` on mount.

### Batch Drill-Down — Paid Phase Trigger

In batch mode, paid phases do **not** auto-trigger when the user drills into a result row. Instead:
- `selectedBatchJD !== null` suppresses the auto-trigger effect
- A "Generate full analysis" card appears in the sidebar when `selectedBatchJD && analysisToken && !hasPaidContent`
- `handleBatchAnalyze()` calls `runPaidPhases` explicitly

**Rationale:** A 4-use token covers exactly one complete analysis (rewrite + study + cover letter + STAR prep first turn). Auto-triggering on every drill-down would exhaust the token after the first result, making all subsequent drill-downs hit 401. The explicit button gives the user control over which role to spend their token on.

### Auto-Trigger Logic (single JD flow)

The auto-trigger effect fires `runPaidPhases` when:
- `analysisToken` is set AND
- `resumeData` and `matchResult` are both non-null AND
- `selectedBatchJD` is null (not a batch drill-down) AND
- None of `rewriteSuggestions`, `studyItems`, `coverLetter` are set AND
- None of the loading flags are true

`handleAnalyze` does NOT call `runPaidPhases` directly — it only sets `matchResult`, and the auto-trigger fires from that state change. This prevents double-invocation.

### State Persistence

**localStorage key: `ps_workspace_v1`**

All workspace state is serialized to localStorage on every change and restored on mount (unless `?success`, `?canceled`, or `?demo` is in the URL).

Saved fields: `resumeData`, `matchResult`, `batchResults`, `rewriteSuggestions`, `studyItems`, `coverLetter`, `jobDescriptions`, `githubProfile`, `linkedinProfile`, `analysisToken`, `tokenExpiresAt`, `interviewBrief`, `enrichedResumeData`, `starQuestions`, `starAnswers`, `activeStarQuestion`, `starMessages`, `interviewMessages`

`resetWorkspace()` clears all state and calls `localStorage.removeItem("ps_workspace_v1")`.

**SessionStorage keys (legacy redirect flow only)**

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
| `lib/tokens.ts` | Token generation, minting, `validateAndConsumeToken`, and `validateTokenOnly` |
| `lib/mergeEnrichedResume.ts` | Pure function: `ResumeData` + `InterviewBrief` → enriched `ResumeData` |
| `app/api/extract/route.ts` | POST — Phase 1: PDF → `ResumeData` (free) |
| `app/api/score/route.ts` | POST — Phase 2: `ResumeData` + JD → `MatchResult` (**free, no auth**) |
| `app/api/rewrite/route.ts` | POST — Phase 3a: `ResumeData` + JD + optional GitHub/LinkedIn → `RewriteSuggestion[]` (token auth) |
| `app/api/study-plan/route.ts` | POST — Phase 3b: `MatchResult` + `ResumeData` + optional LinkedIn → `StudyItem[]` (token auth) |
| `app/api/cover-letter/route.ts` | POST — Phase 4: streaming cover letter or dealbreaker redirect (token auth, 422 gate, `maxDuration=60`) |
| `app/api/interview/route.ts` | POST — Phase 0: multi-turn Experience Interviewer → `InterviewResponse` (**free, no auth**, `claude-haiku-4-5-20251001`) |
| `app/api/generate-star-questions/route.ts` | POST — Phase 5 setup: generates `StarQuestion[]` from gaps (**free, no auth**) |
| `app/api/star-prep/route.ts` | POST — Phase 5: multi-turn STAR coaching → `StarPrepResponse` (token auth, first-turn consume only) |
| `app/api/github-profile/route.ts` | POST — GitHub username → `GitHubProfile` (public API, no auth) |
| `app/api/linkedin-profile/route.ts` | POST — pasted LinkedIn text → `LinkedInProfile` via Claude (free) |
| `app/api/create-payment-intent/route.ts` | POST — creates Stripe PaymentIntent, returns `clientSecret` |
| `app/api/mint-from-payment-intent/route.ts` | POST — verifies PaymentIntent succeeded, mints analysis token |
| `app/api/create-checkout/route.ts` | POST — legacy: creates Stripe Checkout session (redirect flow) |
| `app/api/webhook/route.ts` | POST — Stripe webhook: mints token on `checkout.session.completed` |
| `app/api/redeem-token/route.ts` | POST — frontend exchanges Stripe session ID for analysis token |
| `app/app/page.tsx` (→ `AppExperience`) | Pipeline orchestration, layout, state management |
| `components/AppExperience.tsx` | All app state, phase logic, layout split, tabs, localStorage persistence |
| `components/ExperienceInterviewer.tsx` | Phase 0 chat UI — typing indicator, skip button, `onBriefComplete` callback |
| `components/StarPrepPanel.tsx` | Phase 5 two-column panel — question list + coaching chat + export |
| `components/CheckoutModal.tsx` | In-app dark payment modal (Stripe `Elements` + `PaymentElement`) |
| `components/ResumeUpload.tsx` | PDF drag-and-drop; shows "restored from session" after redirect |
| `components/JobDescriptionList.tsx` | Card-based JD input (up to 6 JDs, one at a time) |
| `components/GitHubConnect.tsx` | GitHub username input with profile preview card |
| `components/LinkedInConnect.tsx` | 2-step LinkedIn paste flow (URL optional, paste immediate) |
| `components/ResumeProfile.tsx` | Structured resume output with skeleton loader |
| `components/MatchScore.tsx` | Score display with recommendation tag badge + severity-tiered gap sections |
| `components/ResumeRewriter.tsx` | Before/after bullet rewrite suggestions |
| `components/StudyPlan.tsx` | Actionable study recommendations per gap |
| `components/CoverLetter.tsx` | Streaming cover letter with "writing…" indicator + copy button |
| `components/BatchResults.tsx` | Sortable batch results table with drill-down |
| `components/PayGate.tsx` | Payment gate — shows score %, unlocks rewrites/study/cover letter/STAR prep |
| `components/LandingPage.tsx` | Marketing landing page with product screenshots and founder story |
| `public/assets/images/` | Product screenshots used in landing page (9 PNGs) |

### TypeScript Interfaces (lib/types.ts)

**Core data:**
- `ResumeData` — extracted candidate info (name, summary, skills, experience, education)
- `MatchResult` — score (0–100), matched skills, `MissingSkill[]` with severity, `recommendation` (must start with `STRONG_FIT|GOOD_FIT|STRETCH|DO_NOT_APPLY — `)
- `MissingSkill` — `{ skill, severity: "dealbreaker" | "learnable" | "soft", reason }`
- `GapSeverity` — union type `"dealbreaker" | "learnable" | "soft"`

**Profile enrichment:**
- `GitHubProfile` — username, bio, publicRepos, followers, topLanguages, repos
- `GitHubRepo` — name, description, language, stars, url
- `LinkedInProfile` — name, headline, currentRole, currentCompany, skills[], summary, `education: string[] | null`
- `LinkedInProfileResponse` — `{ profile: LinkedInProfile }`

**Feature types:**
- `RewriteSuggestion` — originalRole, originalBullet, rewrittenBullet, rationale
- `StudyItem` — skill, severity, action (1-2 sentence recommendation), resource (specific link/name)
- `CoverLetterRequest` — resumeData + matchResult + JD + optional githubProfile + linkedinProfile
- `ScoreRequest` — resumeData + jobDescription + optional githubProfile + linkedinProfile
- `BatchScoreResult` — jobTitle, company, score, matchedSkills, topGaps, recommendation, JD

**Phase 0 — Experience Interviewer types:**
- `ConversationMessage` — `{ role: 'assistant' | 'user'; content: string }`
- `EnrichedExperience` — company, role, `impact: string[]`, `technologies: string[]`, story
- `InterviewBrief` — `{ interview_complete: true; enriched_experiences: EnrichedExperience[]; additional_skills: string[]; notable_context: string }`
- `InterviewRequest` — `{ messages: ConversationMessage[]; resumeData: ResumeData }`
- `InterviewResponse` — `{ message: string; brief?: InterviewBrief; interview_complete: boolean }`

**Phase 5 — STAR Prep types:**
- `StarQuestion` — `{ id, question, targetSkill, difficulty: 'standard' | 'probing' }`
- `StarAnswer` — `{ questionId, question, situation, task, action, result, coachingNotes }`
- `StarPrepRequest` — `{ messages: ConversationMessage[]; resumeData; matchResult; jobDescription; currentQuestion: StarQuestion }`
- `StarPrepResponse` — `{ message: string; answer?: StarAnswer; question_complete: boolean }`

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
`matchResult.recommendation` always begins with `STRONG_FIT|GOOD_FIT|STRETCH|DO_NOT_APPLY — `.

**POST `/api/github-profile`** — Free

Body: `{ "username": "<github-username>" }`
Returns 400 if `username` is missing. Returns 404 if user not found.
Returns `GitHubProfileResponse` (`{ profile: GitHubProfile }`).

**POST `/api/linkedin-profile`** — Free

Body: `{ "profileText": "<raw pasted LinkedIn page text>" }`
Returns 400 if `profileText` is missing.
Returns `LinkedInProfileResponse` (`{ profile: LinkedInProfile }`).
Response includes `education: string[] | null` — each entry formatted as `"Degree, Institution, Year"`.

**POST `/api/interview`** — Phase 0 (free, multi-turn)

Body: `{ "messages": ConversationMessage[], "resumeData": ResumeData }`
Returns 400 if `messages` or `resumeData` is missing.
Returns `InterviewResponse` (`{ message, brief?, interview_complete }`).
When `interview_complete === true`, `brief` contains the full `InterviewBrief`. Pass full `messages[]` history on every turn — no server session state.
Model: `claude-haiku-4-5-20251001` (cost-optimized for free multi-turn route).

**POST `/api/generate-star-questions`** — Phase 5 setup (free, single-shot)

Body: `{ "resumeData": ResumeData, "matchResult": MatchResult, "jobDescription": string }`
Returns `{ questions: StarQuestion[] }`.

---

### Token-Gated Routes (PAID — require `x-analysis-token` header)

All return 402 if `x-analysis-token` header is missing. All return 401 if token is invalid, expired, or exhausted.

**POST `/api/rewrite`** — Phase 3a

Body: `{ "resumeData": { ... }, "jobDescription": "<string>", "githubProfile"?: { ... }, "linkedinProfile"?: { ... } }`
Returns 400 if `resumeData` or `jobDescription` is missing.
Returns `RewriteResponse` (`{ suggestions: RewriteSuggestion[] }`).

**POST `/api/study-plan`** — Phase 3b

Body: `{ "matchResult": { ... }, "resumeData": { ... }, "linkedinProfile"?: { ... } }`
Returns 400 if `matchResult` or `resumeData` is missing.
Returns `StudyPlanResponse` (`{ items: StudyItem[] }`).
Note: dealbreaker gaps are filtered out server-side before calling Claude — only learnable/soft gaps get study items.

**POST `/api/cover-letter`** — Phase 4 (**streaming**)

Body: `{ "resumeData": { ... }, "matchResult": { ... }, "jobDescription": "<string>", "githubProfile"?: { ... }, "linkedinProfile"?: { ... } }`
Returns 400 if `resumeData`, `matchResult`, or `jobDescription` is missing.
**Returns 422** if `matchResult.missingSkills` contains any `severity === "dealbreaker"` entries. Body: `{ error, dealbreakers: string[] }`.
Otherwise returns `text/plain` stream. Read with `response.body.getReader()`.
Hard-capped at 300 words / 500 tokens. `maxDuration = 60`.

**POST `/api/star-prep`** — Phase 5 (**token-gated, multi-turn**)

Body: `{ "messages": ConversationMessage[], "resumeData": ResumeData, "matchResult": MatchResult, "jobDescription": string, "currentQuestion": StarQuestion }`
Requires `x-analysis-token` header.
**Token consumption rule:** Calls `checkStarPrepAccess` → `'consume'` path (via `activateStarPrep`) only on first ever star-prep call for that token. All subsequent calls — any question, any turn, any session — use the `'allow'` path (expiry check only, `uses_remaining` ignored).
Returns `StarPrepResponse` (`{ message, answer?, question_complete }`).
When `question_complete === true`, `answer` contains the full `StarAnswer`.
Model: `claude-sonnet-4-6`.

---

### Payment Routes

**POST `/api/create-payment-intent`** — No auth (primary flow)

Creates a Stripe PaymentIntent priced from `STRIPE_PRICE_ID`.
Returns `{ clientSecret: string, paymentIntentId: string }`.

**POST `/api/mint-from-payment-intent`** — No auth (primary flow)

Body: `{ "paymentIntentId": "<pi_...>" }`
Retrieves the PaymentIntent from Stripe and verifies `status === 'succeeded'`.
Returns 402 if not succeeded. Returns `{ token: "<analysis-token>", expiresAt: "<ISO timestamp>" }` on success.
`mintToken` is idempotent — safe to call twice with the same PaymentIntent ID.

**POST `/api/create-checkout`** — No auth (legacy redirect flow)

Creates a Stripe Checkout session. Returns `{ clientSecret: string }` (embedded mode).

**POST `/api/webhook`** — Stripe signature verified (legacy redirect flow)

On `checkout.session.completed`: mints a **4-use** analysis token in Supabase. Returns 400 if signature verification fails.

**POST `/api/redeem-token`** — No auth (legacy redirect flow)

Body: `{ "sessionId": "<stripe-session-id>" }`
Returns 400/404/410 on error. Returns `{ token: "<analysis-token>" }` on success.

---

## Component Behavior

**AppExperience**
- Central orchestrator: all pipeline state, phase logic, layout switching
- Pre-analysis: `panel-grid` (left column: Upload + GitHub + LinkedIn; right column: JobDescriptionList)
- Post-analysis: `workspace-results` CSS grid (360px sticky sidebar + 1fr main content)
- Sidebar shows: `MatchScore` + `PayGate` (if unpaid) OR batch analyze button (if batch drill-down + token) + session card
- Main area: `BatchResults` table (multi-JD) AND/OR tabbed panel (rewrites / study / cover letter / interview prep) — both can be visible simultaneously
- `resetWorkspace()` clears all state (including all Phase 0 + Phase 5 state), removes `ps_workspace_v1` from localStorage, returns to input view. Guarded by a confirmation modal (`showResetConfirm` state) that inventories what will be lost and prompts the user to export first — both "New Analysis" buttons trigger the modal, not the reset directly.
- Auto-trigger: fires `runPaidPhases` when `analysisToken` + `resumeData` + `matchResult` are all set AND `selectedBatchJD` is null. Skipped in batch drill-down mode.
- `handlePay`: fetches `/api/create-payment-intent`, sets `checkoutClientSecret` → modal opens
- `handlePaymentSuccess(token, expiresAt)`: sets `analysisToken` + `tokenExpiresAt`, closes modal, auto-trigger fires paid phases
- `handleBatchAnalyze()`: explicit paid phase trigger for batch drill-down; called by sidebar button
- `handleExportZip`: uses jszip to package all available output files into a downloadable zip
- `selectedBatchJD` state: tracks which batch row is drilled into; "← Back to all" clears it without destroying `batchResults`
- `isDemo` state: initialized from `window.location.search` at mount; skips localStorage restore/persist
- **Phase 0 banner**: appears after extraction (when `resumeData` is set, no interview yet). "Enhance my resume →" opens `ExperienceInterviewer`; "Skip, analyze now" proceeds directly.
- **`handleBriefComplete(brief)`**: calls `mergeEnrichedResume(resumeData, brief)`, sets `interviewBrief` + `enrichedResumeData`, hides interviewer. All subsequent scoring and paid phases use `enrichedResumeData` instead of raw `resumeData`.
- **`enrichedResumeDataRef`**: ref that mirrors `enrichedResumeData` state — used inside `useCallback`-wrapped functions to avoid stale closures without adding to dependency arrays.
- **Interview Prep tab**: always visible in tab bar once `matchResult` is set. Auto-selected as default tab when scoring completes and no `analysisToken` is present. Shows `PayGate` if unpaid; `StarPrepPanel` if paid.

**ExperienceInterviewer**
- Phase 0 chat UI component
- Props: `resumeData: ResumeData`, `onBriefComplete: (brief: InterviewBrief) => void`, `onSkip: () => void`
- Fires first turn on mount (`{ role: 'user', content: 'Ready to start.' }`)
- Chat bubbles: `.chat-bubble--assistant` (left-aligned) / `.chat-bubble--user` (right-aligned)
- `.typing-indicator` with 3 bouncing dots while loading
- Skip button always visible; input bar hidden when `done === true` (brief received)
- `⌘↵` / `Ctrl↵` shortcut sends message

**StarPrepPanel**
- Phase 5 controlled component — all state is lifted to AppExperience
- Props: `questions`, `answers`, `activeQuestion`, `starMessages` + callbacks for all state changes
- Generates questions on mount via `/api/generate-star-questions` if `questions.length === 0`
- Two-column `.star-prep-layout` (240px question list / 1fr coaching chat)
- Question cards: `.star-q-card--active` for current, `.star-q-card--done` + ✓ badge for completed
- Auto-advances `activeQuestion` to next incomplete question after `question_complete`
- Export button (visible when any answers complete) downloads formatted `.txt` with full STAR structure + coaching notes
- Fresh coaching session per question: `starMessages` reset on question change

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
- 2-step flow: paste view (shown immediately) → parsed profile card
- Paste view shows optional URL input + "Open profile →" link (deep-links to profile if URL provided, otherwise `linkedin.com`)
- POSTs raw text to `/api/linkedin-profile`; shows parsed headline, company, top skills as pills, and education entries if present
- URL is never required — only the pasted text drives parsing
- Passes `LinkedInProfile` to parent via `onProfile` callback

**MatchScore**
- Parses `result.recommendation` for a `STRONG_FIT|GOOD_FIT|STRETCH|DO_NOT_APPLY` prefix
- Renders prefix as a `SeverityPill` badge (green/sage/amber/red) next to "Recommendation" label
- Prose displayed below badge with prefix stripped
- Missing skills in three severity sections (dealbreaker, learnable, soft) with per-item reasons
- Shows skeleton loader during scoring phase

**PayGate**
- Shown after scoring if no `analysisToken` is present and not in batch drill-down
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
- Accepts `selectedJD?: string | null` prop — applies `.batch-row--selected` highlight to the active row
- Drill-down: click row → sets `selectedBatchJD`, shows sidebar analyze button; batch table stays visible

**CheckoutModal**
- Rendered over the app when `checkoutClientSecret` is set in `AppExperience`
- Dark overlay (`.modal-backdrop`) with blurred background; click outside to cancel
- `Elements` + `PaymentElement` with dark Stripe appearance theme
- Skeleton loaders shown until `PaymentElement.onReady` fires
- Pay button disabled until `ready && stripe && elements`
- On success: calls `onSuccess(token, expiresAt)` — modal closes and paid phases begin

---

## Layout System (globals.css)

- `--max-w-content: 1440px` — wide viewport support
- `.workspace-results`: `grid-template-columns: 360px 1fr` — post-analysis split layout
- `.workspace-sidebar`: sticky at `top: 72px`, scrollable with hidden scrollbar
- `.result-tabs` / `.result-tab` / `.result-tab--active`: mono uppercase tab bar, teal active underline
- `.screenshot-gallery`: 2-col grid for landing page product screenshots
- `.no-go-callout`: 2-col grid with red-tinted border for the dealbreaker callout section
- `.chat-messages` / `.chat-bubble` / `.chat-bubble--assistant` / `.chat-bubble--user` / `.chat-input-bar`: Phase 0 + Phase 5 conversation UI
- `.typing-indicator` + `@keyframes typing-bounce`: 3-dot loading animation for assistant responses
- `.star-prep-layout`: `grid-template-columns: 260px 1fr` — Phase 5 two-column layout
- `.star-q-card` / `.star-q-card--active` / `.star-q-card--done`: question list card styles
- `.interview-cta-banner`: Phase 0 opt-in CTA shown after extraction
- Breakpoints: 1100px (sidebar narrows to 300px), 960px (collapses to single column), 720px (star-prep collapses to single column), 480px

---

## Known Gaps / Future Work

- **Batch token model**: A 4-use token covers one complete batch drill-down (rewrite + study + cover letter + STAR prep first turn). Users wanting paid content for multiple batch results must pay again. A future option is tiered pricing for batch runs.
- **Testimonials**: Placeholder section removed. Add real quotes when beta feedback comes in.
- **Phase 0 demo fixtures**: `demoData.ts` does not include demo `InterviewBrief` or `enrichedResumeData`. Demo mode skips Phase 0 entirely.

---

## Commit Convention

```
feat: short description
fix: short description
chore: short description
docs: short description
copy: short description
```

No ticket numbers needed. Keep messages short and imperative.
