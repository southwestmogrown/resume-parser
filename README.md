# PassStack — Resume Analyzer

> Stop guessing. Start applying strategically. Upload your resume, get a battle plan for every job you target.

A developer-focused resume analysis toolkit. Upload a PDF resume, paste one or many job descriptions, and get a full analysis: tiered gap breakdown, tailored bullet rewrites, a cover letter draft, a study plan, and optional GitHub + LinkedIn profile integration. Powered by a multi-phase Claude pipeline.

**[Live Demo →](https://resume-parser-ten-mu.vercel.app/)** — no API key or payment needed, click Try Demo.

---

## Features

### Core Analysis
- **Try Demo — no account needed** — pre-loaded sample resume and JD with realistic results across all features.
- **Free extraction + scoring** — upload a PDF and score it against a job description at no cost.
- **$5 one-time paid upgrade** — unlock bullet rewrites, study plan, and cover letter. No subscription.
- **Native PDF parsing** — Claude reads the PDF via the Anthropic document API. No parsing libraries.
- **Skeleton loading states** — each output panel loads independently with matching skeletons.

### Gap Analysis With Severity Tiers
Missing skills classified into three tiers:
- 🔴 **Dealbreaker** — hard requirements you don't have
- 🟡 **Learnable gap** — skills you could close in weeks with focused effort
- 🟢 **Soft gap** — nice-to-haves or areas where you have adjacent experience

Each gap includes a brief explanation. This turns a raw score into a **go/no-go decision**.

### Resume Bullet Rewrites
Claude rewrites existing bullet points to align with the specific JD's language and priorities. Rendered as before/after diffs with rationale and copy-to-clipboard.

### Cover Letter Draft Generator
One-click cover letter that highlights matched skills, proactively addresses learnable gaps, and mirrors the JD's tone.

### "What to Study" Action Plan
Concrete 1–2 sentence recommendations per learnable gap with specific resource suggestions (docs, courses, repos).

### GitHub + LinkedIn Integration
- **GitHub** — paste a username to pull public repos, top languages, and contribution data into the scoring phase
- **LinkedIn** — paste your LinkedIn page text to extract headline, current role, and skills for richer analysis

### Multi-JD Batch Mode
Add up to 6 job descriptions and score your resume against all of them in one pass. Results render as a sortable ranked table with score, company, title, and top gaps. Click any row to drill into a full single-JD analysis while the table stays visible.

### Persistence + Export
- State is saved to localStorage automatically — refresh the page and your analysis is restored
- **Export as zip** — downloads a `.zip` with separate files: `cover-letter.txt`, `optimized-bullets.txt`, `study-plan.txt`, `match-report.txt`, and `batch-scores.txt` (if batch mode)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| AI | Anthropic SDK — `claude-sonnet-4-6` |
| Payments | Stripe PaymentElement (in-app modal, no redirect) |
| Database | Supabase (token storage) |
| External APIs | GitHub REST API · LinkedIn (paste-based extraction) |
| Deployment | Vercel |

---

## How the Pipeline Works

### Pricing Model

- **Free:** Phase 1 (PDF extraction) + Phase 2 (scoring and gap analysis)
- **Paid ($5 one-time):** Phases 3–4 — bullet rewrites, study plan, cover letter
- **Demo mode:** All features, no payment, pre-loaded sample data

### Single JD Mode (4 phases)

```
PDF upload → base64 encode
  │
  Phase 1 ── POST /api/extract  (free, no auth)
  │            Claude reads PDF as document input
  │            → ResumeData JSON → ResumeProfile panel populates
  │
  Phase 2 ── POST /api/score  (free, no auth)
  │            Claude compares ResumeData + JD (+ optional GitHub/LinkedIn profiles)
  │            → MatchResult JSON with severity-tiered gaps
  │            → MatchScore panel populates
  │
  [ PayGate appears after scoring → $5 in-app Stripe payment → token minted ]
  │
  Phase 3 ── POST /api/rewrite + POST /api/study-plan  (parallel, token required)
  │            Bullet rewrites + study plan for learnable gaps
  │
  Phase 4 ── POST /api/cover-letter  (token required, streaming)
               Tailored cover letter draft streamed to the UI
```

Phases 1→2 are sequential. Phases 3–4 are non-blocking — results still display if one fails.

### Batch Mode

```
PDF upload → POST /api/extract (free, once)
  │
  └── For each JD: POST /api/score (parallel, free)
        → BatchResults table (sortable by score, company, title)

  [ PayGate → $5 payment → token minted ]

  → Click any row → drill into full single-JD paid analysis
    Batch table stays visible alongside paid content
```

### Payment Flow

Clicking Unlock opens a dark in-app modal with Stripe's `PaymentElement`. No redirect to Stripe's hosted page.

```
handlePay → POST /api/create-payment-intent
              → clientSecret → CheckoutModal opens
              → user enters card → stripe.confirmPayment()
              → POST /api/mint-from-payment-intent (verifies PaymentIntent succeeded)
              → analysis token returned → paid phases run automatically
```

The webhook (`/api/webhook`) handles `checkout.session.completed` for any future Stripe Checkout redirect flows, but the primary payment path is PaymentIntent-based.

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Stripe account](https://stripe.com/) with a product set up
- A [Supabase project](https://supabase.com/) for token storage
- An [Anthropic API key](https://console.anthropic.com/)

### Installation

```bash
git clone git@github.com:southwestmogrown/resume-parser.git
cd resume-parser
npm install
cp .env.example .env.local
# Fill in .env.local (see Environment Variables below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click **Try Demo** for instant results, or upload a PDF to start with free extraction + scoring.

### Environment Variables

```env
# AI
ANTHROPIC_API_KEY=sk-ant-...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...   # must have NEXT_PUBLIC_ prefix
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optional
NEXT_PUBLIC_GITHUB_URL=https://github.com/your-org/resume-parser
```

> **Important:** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` must have the `NEXT_PUBLIC_` prefix — Next.js only exposes browser-accessible env vars with that prefix. A restart is required after adding it.

### Supabase Setup

Run this SQL in the Supabase SQL editor:

```sql
create table analysis_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  stripe_session_id text not null unique,
  used boolean not null default false,
  uses_remaining int not null default 3,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index idx_analysis_tokens_token on analysis_tokens(token);
```

### Stripe Setup

1. Create a product: **Products → Create product → One-time price → $5.00 USD**
2. Copy the `price_...` ID to `STRIPE_PRICE_ID`
3. *(Optional — for webhook path)* Add a webhook endpoint at your deployed URL + `/api/webhook`, selecting `checkout.session.completed`. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`.

For local webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

---

## Deployment (Vercel)

1. Push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new)
2. Add all environment variables in the Vercel dashboard (see table above)
3. Deploy

> **Note:** Claude-powered routes set `maxDuration = 30`. The Vercel Hobby plan has a 10-second timeout — upgrade to Pro for reliable operation.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── extract/route.ts              # Phase 1: PDF → ResumeData (free)
│   │   ├── score/route.ts                # Phase 2: → MatchResult (free)
│   │   ├── rewrite/route.ts              # Phase 3a: → RewriteSuggestion[] (token)
│   │   ├── study-plan/route.ts           # Phase 3b: → StudyItem[] (token)
│   │   ├── cover-letter/route.ts         # Phase 4: → cover letter stream (token)
│   │   ├── github-profile/route.ts       # GitHub public API → GitHubProfile
│   │   ├── linkedin-profile/route.ts     # Pasted text → LinkedInProfile via Claude
│   │   ├── create-payment-intent/route.ts # Stripe PaymentIntent → clientSecret
│   │   ├── mint-from-payment-intent/route.ts # Verify PI + mint analysis token
│   │   ├── create-checkout/route.ts      # Legacy: Stripe Checkout session (redirect flow)
│   │   ├── webhook/route.ts              # Stripe webhook → mints token on session.completed
│   │   └── redeem-token/route.ts         # Exchange Stripe session ID for analysis token
│   ├── app/page.tsx                      # App route shell
│   ├── layout.tsx                        # Root layout with metadata
│   ├── page.tsx                          # Landing page
│   └── globals.css                       # Design system, layout, component styles
├── components/
│   ├── AppExperience.tsx                 # Central orchestrator: all state, phases, layout
│   ├── BatchResults.tsx                  # Sortable batch table with drill-down
│   ├── CheckoutModal.tsx                 # In-app dark payment modal (Stripe PaymentElement)
│   ├── CoverLetter.tsx                   # Streaming cover letter with copy button
│   ├── GitHubConnect.tsx                 # GitHub username input + profile preview
│   ├── JobDescriptionList.tsx            # Card-based JD input (up to 6)
│   ├── LinkedInConnect.tsx               # 3-step paste flow → LinkedInProfile
│   ├── MatchScore.tsx                    # Score + severity-tiered gap sections
│   ├── PassStackLogo.tsx                 # Brand logo component
│   ├── PayGate.tsx                       # Payment gate shown after free scoring
│   ├── ResumeProfile.tsx                 # Structured candidate profile display
│   ├── ResumeRewriter.tsx                # Before/after bullet rewrite suggestions
│   ├── ResumeUpload.tsx                  # PDF drag-and-drop upload zone
│   ├── Spinner.tsx                       # Inline loading spinner
│   └── StudyPlan.tsx                     # Actionable study plan per gap
└── lib/
    ├── anthropic.ts                      # Anthropic client singleton (server-side)
    ├── demoData.ts                       # Demo fixtures for all features
    ├── extractPdfText.ts                 # File → base64 for Anthropic document input
    ├── stripe.ts                         # Stripe client singleton (server-side)
    ├── supabaseAdmin.ts                  # Supabase service-role client
    ├── tokens.ts                         # Token minting, validation, consumption
    └── types.ts                          # All shared TypeScript interfaces
```

---

## License

MIT
