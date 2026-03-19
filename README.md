# Resume Parser

> Upload a PDF resume, paste a job description, get an AI-powered match score and skill gap analysis — in seconds.

Built to demonstrate practical Anthropic API usage: native PDF parsing, structured JSON extraction, and a sequential two-phase prompt pipeline — no PDF libraries, no vector databases, no boilerplate.

**[Live Demo →](https://your-deployment.vercel.app)** — no API key needed, just click Try Demo.

---

## Features

- **Try Demo — no account needed** — pre-loaded sample resume and job description with a realistic result. See the full experience before committing to anything.
- **Bring Your Own Key (BYOK)** — paste your Anthropic API key directly in the browser. It never touches the server beyond a pass-through header — not logged, not stored, not seen.
- **Native PDF parsing** — Claude reads the PDF via the Anthropic document API. No parsing libraries, no text extraction preprocessing.
- **Two-phase Claude pipeline** — Phase 1 extracts a structured candidate profile. Phase 2 scores it against the job description independently, so results appear progressively as each phase completes.
- **Match scoring with skill gap analysis** — 0–100 score with color thresholds (green / amber / red), matched skills, missing skills, and a hiring recommendation.
- **Skeleton loading states** — each output panel loads independently with matching skeletons while its phase runs.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| AI | Anthropic SDK — `claude-sonnet-4-6` |
| Deployment | Vercel |

---

## How the Pipeline Works

```
PDF upload → base64 encode
  │
  ├── POST /api/extract
  │     Claude reads PDF as document input
  │     → structured ResumeData JSON
  │     → ResumeProfile panel populates
  │
  └── POST /api/score
        Claude compares ResumeData + job description
        → MatchResult JSON (score, matched, missing, recommendation)
        → MatchScore panel populates
```

The two phases run sequentially so Phase 2 can consume Phase 1's structured output rather than re-reading the raw PDF. Each route instantiates the Anthropic client with the user's key from the `x-api-key` header — no server-side key management required.

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

- Click **Try Demo** to run the app immediately with pre-loaded sample data.
- Or paste your Anthropic API key (`sk-ant-...`) to analyze a real resume.

No `.env.local` configuration is required to run the app locally.

---

## Usage

1. Open the app — the key gate appears on first visit
2. Click **Try Demo** for instant pre-loaded results, or enter your Anthropic API key
3. Upload a PDF resume via the drag-and-drop zone or file picker
4. Paste a job description into the right panel
5. Click **Analyze**

The candidate profile populates as Phase 1 completes. The match score and skill breakdown appear after Phase 2. Both panels show skeleton loaders while their phase is running.

---

## Deployment

### Vercel

1. Push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new)
2. Add one optional environment variable:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_GITHUB_URL` | No | Repo URL shown as a "View source" link in the key gate modal |

3. Deploy. No other configuration needed — users supply their own Anthropic keys at runtime.

> **Note:** The Hobby plan has a 10-second function timeout. The routes include `maxDuration = 9` to surface a clean error instead of a silent gateway failure. Upgrade to Pro (60s limit) for longer resumes or job descriptions.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── extract/route.ts   # Phase 1: PDF → structured ResumeData
│   │   └── score/route.ts     # Phase 2: ResumeData + JD → MatchResult
│   ├── layout.tsx             # Root layout with metadata
│   ├── page.tsx               # Main page — state and pipeline wiring
│   └── globals.css            # Tailwind v4 theme and global styles
├── components/
│   ├── AccessKeyGate.tsx      # BYOK key gate with demo mode entry point
│   ├── ErrorBoundary.tsx      # React error boundary
│   ├── JobDescription.tsx     # Textarea with char count and controlled mode
│   ├── MatchScore.tsx         # Score display with skill gap lists
│   ├── ResumeProfile.tsx      # Structured candidate profile display
│   ├── ResumeUpload.tsx       # PDF drag-and-drop upload zone
│   └── Spinner.tsx            # Inline loading spinner
└── lib/
    ├── demoData.ts            # Canned ResumeData, MatchResult, and sample JD
    ├── extractPdfText.ts      # File → base64 utility for Anthropic input
    └── types.ts               # Shared TypeScript interfaces
```

---

## License

MIT
