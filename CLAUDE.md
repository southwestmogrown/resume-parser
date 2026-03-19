# Resume Parser — Claude Code Guide

## Project Overview

A Next.js portfolio app that parses a PDF resume and scores it against a job description using two sequential Claude API calls. Built to demonstrate practical Claude API usage.

**Stack:** Next.js (App Router), TypeScript, Tailwind CSS
**Deployment:** Frontend on Vercel, API routes deployable via Railway
**Auth:** Session-based passphrase gate (sessionStorage + API key header)

---

## Architecture

### Two-Phase Claude Pipeline

1. **Extraction phase** — Claude reads the PDF (base64-encoded) and returns structured `ResumeData`
2. **Scoring phase** — Claude compares `ResumeData` against the job description and returns `MatchResult`

These run sequentially. The UI reflects each phase independently — `ResumeProfile` populates after phase 1; `MatchScore` populates after phase 2.

### Key Files

| Path | Purpose |
|---|---|
| `lib/types.ts` | All shared TypeScript interfaces |
| `lib/extractPdfText.ts` | Converts File → base64 for Anthropic document input |
| `app/api/analyze/route.ts` | POST handler — runs both Claude phases, returns `AnalysisResponse` |
| `app/page.tsx` | Main page — composes all components, wires the pipeline |
| `components/ResumeUpload.tsx` | PDF drag-and-drop input |
| `components/JobDescription.tsx` | Job description textarea input |
| `components/ResumeProfile.tsx` | Structured resume output with skeleton loader |
| `components/MatchScore.tsx` | Score display with color thresholds and skeleton loader |

### TypeScript Interfaces (lib/types.ts)

- `ResumeData` — extracted candidate info (name, summary, skills, experience, education)
- `MatchResult` — score (0–100), matched skills, missing skills, recommendation
- `AnalysisRequest` — `{ resume: string (base64), jobDescription: string }`
- `AnalysisResponse` — `{ resumeData: ResumeData, matchResult: MatchResult }`

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | `.env.local` + Vercel | Claude API calls |
| `ACCESS_KEY` | `.env.local` + Vercel | Passphrase gate validation |

Always keep `.env.local` out of git. Use `.env.example` to document required vars without values.

---

## API Route Contract

**POST `/api/analyze`**

Headers:
- `x-access-key: <ACCESS_KEY>` — required; returns 401 if missing or invalid

Body:
```json
{ "resume": "<base64 PDF string>", "jobDescription": "<string>" }
```

Returns 400 if either field is missing.
Returns `AnalysisResponse` JSON on success.

---

## Component Behavior

**ResumeUpload**
- Accepts PDF only via click or drag-and-drop
- Rejects non-PDF with inline error
- Shows filename after selection; clear button resets

**JobDescription**
- Auto-expanding textarea
- Live character count

**ResumeProfile**
- Skills render as pills
- Shows skeleton loader during extraction phase
- Renders nothing if no data yet

**MatchScore**
- Score color: green ≥80%, amber 60–79%, red <60%
- Matched and missing skills in separate lists
- Shows skeleton loader during scoring phase

**Page (app/page.tsx)**
- Analyze button disabled until both resume and JD are provided
- Results panels hidden until first analysis completes
- Errors displayed inline if API call fails
- API key read from env and sent as request header

---

## Access Key Gate

Frontend modal shown on first visit. Correct key stored in `sessionStorage` for the session. Wrong key shows error and prompts re-entry. All fetch calls include the key as `x-access-key` header.

---

## Milestones

| Milestone | Scope |
|---|---|
| M1 — Foundation | Scaffold, types, PDF utility, API route |
| M2 — UI & Analysis | All components + page assembly |
| M3 — Polish & Ship | Key gate UI, polish pass, README, deploy |

---

## Commit Convention

```
feat: short description
fix: short description
chore: short description
docs: short description
```

No ticket numbers needed. Keep messages short and imperative.
