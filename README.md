# Resume Parser

> Stop guessing. Start applying strategically. Upload your resume, get a battle plan for every job you target.

An application toolkit for developers — not another recruiter screening tool. Upload a PDF resume, paste one or many job descriptions, and get a full analysis: tiered gap breakdown, tailored bullet rewrites, a cover letter draft, a study plan, and optional GitHub profile integration. All powered by a multi-phase Claude pipeline.

**[Live Demo →](https://resume-parser-ten-mu.vercel.app/)** — no API key needed, just click Try Demo.

---

## Features

### Core Analysis
- **Try Demo — no account needed** — pre-loaded sample resume and job description with realistic results across all features. See the full experience before committing to anything.
- **Bring Your Own Key (BYOK)** — paste your Anthropic API key directly in the browser. It never touches the server beyond a pass-through header — not logged, not stored, not seen.
- **Native PDF parsing** — Claude reads the PDF via the Anthropic document API. No parsing libraries, no text extraction preprocessing.
- **Skeleton loading states** — each output panel loads independently with matching skeletons while its pipeline phase runs.

### Gap Analysis With Severity Tiers
Missing skills are classified into three tiers instead of a flat list:
- 🔴 **Dealbreaker** — hard requirements you don't have (e.g., "5+ years," required security clearance)
- 🟡 **Learnable gap** — skills you could close in weeks with focused effort (e.g., a specific framework, a CI/CD tool)
- 🟢 **Soft gap** — nice-to-haves you're missing, or areas where you have adjacent experience

Each gap includes a brief explanation of its classification. This turns a raw score into a **go/no-go decision**.

### Resume Bullet Rewrites
For each experience entry, Claude suggests rewritten bullet points that reframe existing experience to align with the specific job description's language and priorities. Rendered as a before/after diff with copy-to-clipboard and a rationale for each rewrite.

### Cover Letter Draft Generator
One-click cover letter generation that highlights matched skills, proactively addresses learnable gaps with a framing strategy, and mirrors the job description's tone. Output in markdown with copy-to-clipboard.

### "What to Study" Action Plan
For each learnable gap, a concrete 1–2 sentence study recommendation with a specific resource suggestion — official docs, a well-known course, or a GitHub repo to study. Actionable, not generic.

### GitHub Profile Integration
Optional: paste a GitHub username to fetch public repos, languages, and contribution data. This is fed into the scoring phase as supplementary evidence — "You have 12 TypeScript repos and contributed to a Next.js library" is stronger signal than a bullet point.

### Multi-JD Batch Mode
Paste multiple job descriptions (separated by `---`) and score your resume against all of them in one pass. Results render as a sortable ranked table with score, company, title, and top gaps. Click any row to drill down into a full single-JD analysis.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| AI | Anthropic SDK — `claude-sonnet-4-6` |
| External API | GitHub REST API (public, no auth) |
| Deployment | Vercel |

---

## How the Pipeline Works

### Single JD Mode (4 phases)

```
PDF upload → base64 encode
  │
  Phase 1 ── POST /api/extract
  │            Claude reads PDF as document input
  │            → ResumeData JSON → ResumeProfile panel populates
  │
  Phase 2 ── POST /api/score
  │            Claude compares ResumeData + JD (+ optional GitHub profile)
  │            → MatchResult JSON with severity-tiered gaps
  │            → MatchScore panel populates
  │
  Phase 3 ── POST /api/rewrite + POST /api/study-plan  (parallel)
  │            Bullet rewrites + study plan for learnable gaps
  │            → ResumeRewriter + StudyPlan panels populate
  │
  Phase 4 ── POST /api/cover-letter
               Generates tailored cover letter draft
               → CoverLetter panel populates
```

Phases 1→2 are sequential (Phase 2 consumes Phase 1 output). Phases 3–4 are non-blocking — if they fail, earlier results are still displayed. Each route instantiates the Anthropic client with the user's key from the `x-api-key` header.

### Batch Mode

```
PDF upload → base64 encode → POST /api/extract (once)
  │
  └── For each JD: POST /api/score (parallel)
        → BatchResults table (sortable by score, company, title)
        → Click any row → drill down into single-JD analysis
```

The resume is extracted once and reused across all JD scoring calls.

### GitHub Integration

```
Username → POST /api/github-profile
             Fetches public repos, languages, bio via GitHub REST API
             → GitHubConnect preview card
             → Profile data passed into Phase 2 scoring context
```

No GitHub auth token needed — uses public API endpoints only.

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/) — or just use Demo mode, no key needed

### Installation

```bash
git clone git@github.com:southwestmogrown/resume-parser.git
cd resume-parser
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- Click **Try Demo** to run the app immediately with pre-loaded sample data (all features demonstrated).
- Or paste your Anthropic API key (`sk-ant-...`) to analyze a real resume.

No `.env.local` configuration is required to run the app locally.

---

## Usage

### Single JD Analysis

1. Open the app — the key gate appears on first visit
2. Click **Try Demo** for instant pre-loaded results, or enter your Anthropic API key
3. Upload a PDF resume via the drag-and-drop zone or file picker
4. *(Optional)* Enter a GitHub username to include public profile data in the analysis
5. Paste a job description into the right panel (ensure **Single JD** mode is selected)
6. Click **Analyze**

Results appear progressively: candidate profile → match score with tiered gaps → bullet rewrites + study plan → cover letter draft.

### Batch Mode

1. Upload a resume and optionally connect GitHub
2. Switch to **Batch Mode** using the toggle above the JD panel
3. Paste multiple job descriptions separated by a line containing only `---`
4. Click **Score Against N Jobs**
5. Results appear as a sortable table — click any row to drill down into full analysis

---

## Deployment

### Vercel

1. Push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new)
2. Add one optional environment variable:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_GITHUB_URL` | No | Repo URL shown as a "View source" link in the key gate modal |

3. Deploy. No other configuration needed — users supply their own Anthropic keys at runtime.

> **Note:** Routes set `maxDuration = 30` for Claude-powered phases. The Vercel Hobby plan has a 10-second function timeout — upgrade to Pro (60s limit) for reliable operation with longer resumes or multiple pipeline phases.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── extract/route.ts       # Phase 1: PDF → structured ResumeData
│   │   ├── score/route.ts         # Phase 2: ResumeData + JD → MatchResult (tiered gaps)
│   │   ├── rewrite/route.ts       # Phase 3a: ResumeData + JD → RewriteSuggestion[]
│   │   ├── study-plan/route.ts    # Phase 3b: MatchResult → StudyItem[]
│   │   ├── cover-letter/route.ts  # Phase 4: ResumeData + MatchResult + JD → cover letter
│   │   └── github-profile/route.ts # GitHub public API → GitHubProfile
│   ├── layout.tsx                 # Root layout with metadata
│   ├── page.tsx                   # Main page — state, pipeline, and mode orchestration
│   └── globals.css                # Tailwind v4 theme and global styles
├── components/
│   ├── AccessKeyGate.tsx          # BYOK key gate with demo mode entry point
│   ├── BatchJobDescriptions.tsx   # Multi-JD textarea input with --- separator
│   ├── BatchResults.tsx           # Sortable batch results table with drill-down
│   ├── CoverLetter.tsx            # Cover letter display with copy-to-clipboard
│   ├── ErrorBoundary.tsx          # React error boundary
│   ├── GitHubConnect.tsx          # GitHub username input with profile preview
│   ├── JobDescription.tsx         # Textarea with char count and controlled mode
│   ├── MatchScore.tsx             # Score display with severity-tiered gap sections
│   ├── ResumeProfile.tsx          # Structured candidate profile display
│   ├── ResumeRewriter.tsx         # Before/after bullet rewrite suggestions
│   ├── ResumeUpload.tsx           # PDF drag-and-drop upload zone
│   ├── Spinner.tsx                # Inline loading spinner
│   └── StudyPlan.tsx              # Actionable study recommendations per gap
└── lib/
    ├── demoData.ts                # Demo fixtures for all features
    ├── extractPdfText.ts          # File → base64 utility for Anthropic input
    └── types.ts                   # All shared TypeScript interfaces
```

---

## License

MIT
