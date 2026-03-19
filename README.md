# Resume Parser

> Upload a PDF resume, paste a job description, get an AI-powered match score and skill gap analysis — in seconds.

Built as a portfolio project to demonstrate practical Claude API usage: native PDF parsing, structured JSON extraction, and multi-phase prompt pipelines — no PDF libraries, no vector databases, no boilerplate.

---

## Features

- **Drag-and-drop PDF upload** — Claude reads the PDF natively via the Anthropic document API. No parsing library needed.
- **Two-phase Claude pipeline** — Phase 1 extracts a structured candidate profile. Phase 2 scores it against the job description independently, so results appear progressively.
- **Match scoring with skill gap analysis** — 0–100 score with color thresholds, matched skills, missing skills, and a hiring recommendation paragraph.
- **Session-based access gate** — Passphrase modal on first visit, stored in `sessionStorage`. No login flow, no database.
- **Skeleton loading states** — Each output panel loads independently as its phase completes, with matching skeletons during the wait.

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

## Getting Started

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Installation

```bash
# Clone the repo
git clone git@github.com:southwestmogrown/resume-parser.git
cd resume-parser

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

Edit `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-...
ACCESS_KEY=your-chosen-passphrase
```

```bash
# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app will prompt for the access key on first load — enter whatever you set as `ACCESS_KEY`.

---

## Usage

1. Enter the access key when prompted (set by `ACCESS_KEY` in your env)
2. Upload a PDF resume via the drag-and-drop zone or file picker
3. Paste a job description into the right panel
4. Click **Analyze**

The candidate profile populates as soon as Phase 1 completes. The match score and skill gap appear after Phase 2. Both panels show skeleton loaders while their phase is running.

---

## How the Pipeline Works

```
PDF upload → base64 encode → POST /api/analyze
  ├── Phase 1: Claude reads PDF as document input → structured ResumeData JSON
  └── Phase 2: Claude compares ResumeData + job description → MatchResult JSON
```

The API route (`/api/analyze`) validates the `x-access-key` header before making any Claude calls. The two phases run sequentially so Phase 2 can use Phase 1's structured output rather than re-reading the PDF.

---

## Deployment

### Vercel

1. Push the repo to GitHub and import it into [Vercel](https://vercel.com)
2. Add the following environment variables in the Vercel dashboard:

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `ACCESS_KEY` | The passphrase that gates access to the app |

3. Deploy. No build configuration needed — Next.js is detected automatically.

---

## Project Structure

```
src/
├── app/
│   ├── api/analyze/route.ts   # Two-phase Claude pipeline endpoint
│   ├── layout.tsx             # Root layout with metadata
│   ├── page.tsx               # Main page — state and pipeline wiring
│   └── globals.css            # Tailwind v4 theme and global styles
├── components/
│   ├── AccessKeyGate.tsx      # Session-based passphrase gate
│   ├── ErrorBoundary.tsx      # React error boundary
│   ├── JobDescription.tsx     # Job description textarea with char count
│   ├── MatchScore.tsx         # Score display with skill gap lists
│   ├── ResumeProfile.tsx      # Structured candidate profile display
│   ├── ResumeUpload.tsx       # PDF drag-and-drop upload zone
│   └── Spinner.tsx            # Inline loading spinner
└── lib/
    ├── extractPdfText.ts      # File → base64 utility for Anthropic input
    └── types.ts               # Shared TypeScript interfaces
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key — used server-side only |
| `ACCESS_KEY` | Yes | Passphrase validated by the API route |

Neither variable is exposed to the browser. The frontend sends the user-entered key as a request header; the server compares it to `ACCESS_KEY` at the edge.

---

## License

MIT
