# Resume Parser

> Stop guessing. Start applying strategically. Upload your resume, get a battle plan for every job you target.

An application toolkit for developers — not another recruiter screening tool. Upload a PDF resume, paste one or many job descriptions, and get a full analysis: tiered gap breakdown, tailored bullet rewrites, a cover letter draft, a study plan, and optional GitHub profile integration. All powered by a multi-phase Claude pipeline.

**[Live Demo →](https://resume-parser-ten-mu.vercel.app/)** — no API key or payment needed, just click Try Demo.

---

## Features

### Core Analysis
- **Try Demo — no account needed** — pre-loaded sample resume and job description with realistic results across all features. See the full experience before committing to anything.
- **Free resume extraction** — upload a PDF and get your structured resume profile instantly, at no cost.
- **$5 one-time paid upgrade** — unlock gap analysis, bullet rewrites, study plan, and cover letter generation. No subscription.
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
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| AI | Anthropic SDK — `claude-sonnet-4-6` |
| Payments | Stripe Checkout |
| Database | Supabase |
| External API | GitHub REST API (public, no auth) |
| Deployment | Vercel |

---

## How the Pipeline Works

### Pricing Model

- **Free:** Phase 1 — PDF extraction and resume profile display
- **Paid ($5 one-time):** Phases 2–4 — gap analysis, bullet rewrites, study plan, cover letter
- **Demo mode:** All features, no payment, pre-loaded sample data

### Single JD Mode (4 phases)

```
PDF upload → base64 encode
  │
  Phase 1 ── POST /api/extract  (free, no token)
  │            Claude reads PDF as document input
  │            → ResumeData JSON → ResumeProfile panel populates
  │
  [ PayGate appears → $5 Stripe checkout → token minted ]
  │
  Phase 2 ── POST /api/score  (token required)
  │            Claude compares ResumeData + JD (+ optional GitHub profile)
  │            → MatchResult JSON with severity-tiered gaps
  │            → MatchScore panel populates
  │
  Phase 3 ── POST /api/rewrite + POST /api/study-plan  (parallel, token required)
  │            Bullet rewrites + study plan for learnable gaps
  │            → ResumeRewriter + StudyPlan panels populate
  │
  Phase 4 ── POST /api/cover-letter  (token required)
               Generates tailored cover letter draft
               → CoverLetter panel populates
```

Phases 1→2 are sequential (Phase 2 consumes Phase 1 output). Phases 3–4 are non-blocking — if they fail, earlier results are still displayed.

### Batch Mode

```
PDF upload → base64 encode → POST /api/extract (free, once)
  │
  [ PayGate → $5 checkout → token minted ]
  │
  └── For each JD: POST /api/score (parallel, token required)
        → BatchResults table (sortable by score, company, title)
        → Click any row → drill down into single-JD analysis
```

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
- A [Stripe account](https://stripe.com/) with a product set up (for paid features)
- A [Supabase project](https://supabase.com/) for token storage
- An [Anthropic API key](https://console.anthropic.com/)

### Installation

```bash
git clone git@github.com:southwestmogrown/resume-parser.git
cd resume-parser
npm install
cp .env.example .env.local
# Fill in .env.local with your keys (see Environment Variables below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- Click **Try Demo** to run the app immediately with pre-loaded sample data (all features demonstrated).
- Or upload a PDF to start with the free extraction phase.

### Environment Variables

```env
# Required for paid features
ANTHROPIC_API_KEY=sk-ant-...          # Anthropic API key (server-side only)
STRIPE_SECRET_KEY=sk_live_...          # Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_live_...    # Stripe publishable key (exposed to frontend)
STRIPE_PRICE_ID=price_...             # Stripe one-time price ID ($5)
STRIPE_WEBHOOK_SECRET=whsec_...       # Stripe webhook signing secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # Supabase service role key (server-side only)

# Optional
NEXT_PUBLIC_GITHUB_URL=https://github.com/your-org/resume-parser
```

### Supabase Setup

Run this SQL in the Supabase SQL editor to create the tokens table:

```sql
create table analysis_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  stripe_session_id text not null unique,
  used boolean not null default false,
  uses_remaining int not null default 4,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index idx_analysis_tokens_token on analysis_tokens(token);
```

### Stripe Setup

1. Create a product in the Stripe dashboard: **Products → Create product → Resume Analysis → One-time price → $5.00 USD**
2. Copy the `price_...` ID to `STRIPE_PRICE_ID`
3. Add a webhook endpoint: your deployed URL + `/api/webhook`, select `checkout.session.completed`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

For local development, use the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

---

## Usage

### Single JD Analysis

1. Open the app
2. Click **Try Demo** for instant pre-loaded results, or upload a PDF to start free
3. Upload a PDF resume via the drag-and-drop zone or file picker
4. *(Optional)* Enter a GitHub username to include public profile data in the analysis
5. Paste a job description into the right panel (ensure **Single JD** mode is selected)
6. Click **Analyze**
7. After Phase 1 completes, the PayGate appears — click **Unlock Full Analysis →** to pay $5 via Stripe
8. After payment, Phases 2–4 run automatically

Results appear progressively: candidate profile → match score with tiered gaps → bullet rewrites + study plan → cover letter draft.

### Batch Mode

1. Upload a resume and optionally connect GitHub
2. Switch to **Batch Mode** using the toggle above the JD panel
3. Paste multiple job descriptions separated by a line containing only `---`
4. Click **Score Against N Jobs**
5. After the free extraction, pay to unlock full batch analysis
6. Results appear as a sortable table — click any row to drill down into full analysis

---

## Deployment

### Vercel

1. Push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new)
2. Add environment variables in the Vercel dashboard:

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key (server-side) |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key |
| `STRIPE_PRICE_ID` | Yes | Stripe price ID |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook secret |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `NEXT_PUBLIC_GITHUB_URL` | No | Repo URL shown in the app footer |

3. Deploy.

> **Note:** Routes set `maxDuration = 30` for Claude-powered phases. The Vercel Hobby plan has a 10-second function timeout — upgrade to Pro (60s limit) for reliable operation with longer resumes or multiple pipeline phases.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── extract/route.ts        # Phase 1: PDF → ResumeData (free, no auth)
│   │   ├── score/route.ts         # Phase 2: → MatchResult (token required)
│   │   ├── rewrite/route.ts       # Phase 3a: → RewriteSuggestion[] (token required)
│   │   ├── study-plan/route.ts    # Phase 3b: → StudyItem[] (token required)
│   │   ├── cover-letter/route.ts   # Phase 4: → cover letter (token required)
│   │   ├── github-profile/route.ts # GitHub public API → GitHubProfile (no auth)
│   │   ├── create-checkout/route.ts # Stripe Checkout session creation
│   │   ├── webhook/route.ts         # Stripe webhook → mints analysis token
│   │   └── redeem-token/route.ts   # Exchange Stripe session ID for analysis token
│   ├── layout.tsx                  # Root layout with metadata
│   ├── page.tsx                    # Main page — state, pipeline, and mode orchestration
│   └── globals.css                 # Tailwind theme and global styles
├── components/
│   ├── BatchJobDescriptions.tsx    # Multi-JD textarea input with --- separator
│   ├── BatchResults.tsx            # Sortable batch results table with drill-down
│   ├── CoverLetter.tsx            # Cover letter display with copy-to-clipboard
│   ├── ErrorBoundary.tsx          # React error boundary
│   ├── GitHubConnect.tsx          # GitHub username input with profile preview
│   ├── JobDescription.tsx          # Textarea with char count and controlled mode
│   ├── MatchScore.tsx             # Score display with severity-tiered gap sections
│   ├── PayGate.tsx                # Payment gate after Phase 1 (Stripe checkout trigger)
│   ├── ResumeProfile.tsx          # Structured candidate profile display
│   ├── ResumeRewriter.tsx         # Before/after bullet rewrite suggestions
│   ├── ResumeUpload.tsx           # PDF drag-and-drop upload zone
│   ├── Spinner.tsx                # Inline loading spinner
│   └── StudyPlan.tsx              # Actionable study recommendations per gap
└── lib/
    ├── anthropic.ts               # Server-side Anthropic client singleton
    ├── demoData.ts                # Demo fixtures for all features
    ├── extractPdfText.ts          # File → base64 utility for Anthropic input
    ├── stripe.ts                  # Server-side Stripe client singleton
    ├── supabaseAdmin.ts           # Supabase service-role client (server-side token writes)
    ├── tokens.ts                  # Token generation, minting, and validation
    └── types.ts                   # All shared TypeScript interfaces
```

---

## License

MIT
