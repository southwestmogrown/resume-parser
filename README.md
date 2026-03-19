# Resume Parser

An AI-powered resume analysis tool built with Next.js and Claude. Upload a PDF resume, paste a job description, and get a structured candidate profile plus a match score with skill gap analysis.

**Live demo:** _coming soon_

---

## How it works

The app runs a two-phase Claude pipeline on each analysis:

1. **Extraction** — Claude reads the PDF natively (no parsing library) and returns structured JSON: candidate name, summary, skills, experience timeline, and education.
2. **Scoring** — Claude compares the extracted profile against the job description and returns a 0–100 match score, matched skills, missing skills, and a hiring recommendation.

Both phases use `claude-sonnet-4-6` via the [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript). The API route validates requests with a shared access key before making any Claude calls.

---

## Tech stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **AI:** Anthropic SDK (`claude-sonnet-4-6`)
- **Deployment:** Vercel (frontend + API routes)

---

## Local setup

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Steps

```bash
git clone git@github.com:southwestmogrown/resume-parser.git
cd resume-parser
npm install
```

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
ACCESS_KEY=your-chosen-passphrase
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app will prompt for the access key on first load — enter whatever you set as `ACCESS_KEY`.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude calls |
| `ACCESS_KEY` | Yes | Passphrase that gates access to the app |

---

## Access key

The app uses a simple session-based passphrase gate. On first visit, a modal prompts for the key. The correct key is stored in `sessionStorage` for the duration of the browser session — no login or account needed.

For demo visitors: the access key is available on request.

---

## Project structure

```
src/
├── app/
│   ├── api/analyze/route.ts   # Two-phase Claude pipeline
│   ├── layout.tsx
│   ├── page.tsx               # Main page — state + pipeline wiring
│   └── globals.css
├── components/
│   ├── AccessKeyGate.tsx      # Session passphrase gate
│   ├── ErrorBoundary.tsx      # React error boundary
│   ├── JobDescription.tsx     # Job description textarea
│   ├── MatchScore.tsx         # Score display with skill lists
│   ├── ResumeProfile.tsx      # Structured resume display
│   ├── ResumeUpload.tsx       # PDF drag-and-drop upload
│   └── Spinner.tsx            # Loading spinner
└── lib/
    ├── extractPdfText.ts      # File → base64 utility
    └── types.ts               # Shared TypeScript interfaces
```
