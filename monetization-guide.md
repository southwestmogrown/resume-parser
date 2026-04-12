# Resume Parser — Monetization Layer (Claude Code Guide)

## Overview

Add a Stripe payment gate to the Resume Parser. Replace the BYOK modal with a freemium model:
- **Free:** Phase 1 (PDF extraction → ResumeData) runs for everyone
- **Paid ($5):** Phases 2–4 (scoring, rewrites, study plan, cover letter) gate behind a Stripe one-time payment
- **Token system:** Stripe webhook mints a single-use analysis token stored in Supabase; frontend exchanges token to unlock paid phases

No user accounts required. Tokens are UUID-based, salted, single-use.

---

## New Environment Variables

Add to `.env.local` and Vercel:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_ID=price_...        # One-time $5 price from Stripe dashboard
STRIPE_WEBHOOK_SECRET=whsec_...  # From `stripe listen` CLI or Stripe dashboard webhook
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
SUPABASE_URL=...                 # Already exists
SUPABASE_SERVICE_ROLE_KEY=...    # Already exists (use service role for token writes)
```

---

## Supabase Schema

Run this migration in the Supabase SQL editor:

```sql
create table analysis_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  stripe_session_id text not null unique,
  used boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

-- Index for fast token lookup
create index idx_analysis_tokens_token on analysis_tokens(token);

-- Auto-cleanup: tokens expire after 24 hours (optional cron or handle in code)
```

---

## New Dependencies

```bash
npm install stripe @stripe/stripe-js
```

---

## New Files to Create

### `lib/stripe.ts`

Server-side Stripe client singleton.

```typescript
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});
```

### `lib/supabaseAdmin.ts`

Service-role Supabase client for server-side token writes (separate from any existing client-side instance).

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### `lib/tokens.ts`

Token generation and validation utilities.

```typescript
import { createHash, randomBytes } from 'crypto';
import { supabaseAdmin } from './supabaseAdmin';

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function mintToken(stripeSessionId: string): Promise<string> {
  const token = generateToken();
  const { error } = await supabaseAdmin.from('analysis_tokens').insert({
    token,
    stripe_session_id: stripeSessionId,
  });
  if (error) throw new Error(`Failed to mint token: ${error.message}`);
  return token;
}

export async function validateAndConsumeToken(token: string): Promise<boolean> {
  // Fetch token row
  const { data, error } = await supabaseAdmin
    .from('analysis_tokens')
    .select('id, used, expires_at')
    .eq('token', token)
    .single();

  if (error || !data) return false;
  if (data.used) return false;
  if (new Date(data.expires_at) < new Date()) return false;

  // Mark as used (single-use)
  const { error: updateError } = await supabaseAdmin
    .from('analysis_tokens')
    .update({ used: true })
    .eq('token', token);

  return !updateError;
}
```

---

## New API Routes

### `app/api/create-checkout/route.ts`

Creates a Stripe Checkout session and returns the URL. Frontend redirects user to it.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') || 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: `${origin}/?token={CHECKOUT_SESSION_ID}&success=true`,
    cancel_url: `${origin}/?canceled=true`,
    metadata: {
      product: 'resume_analysis',
    },
  });

  return NextResponse.json({ url: session.url });
}
```

**Note:** `{CHECKOUT_SESSION_ID}` is a Stripe template literal — Stripe replaces it with the actual session ID. The frontend will use this session ID to poll for the minted token.

---

### `app/api/webhook/route.ts`

Receives Stripe events. On `checkout.session.completed`, mints a token in Supabase.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { mintToken } from '@/lib/tokens';

export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    try {
      await mintToken(session.id);
    } catch (err: any) {
      console.error('Token mint failed:', err.message);
      return NextResponse.json({ error: 'Token mint failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
```

---

### `app/api/redeem-token/route.ts`

Frontend calls this after Stripe redirect. Exchanges Stripe session ID for the minted analysis token.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('analysis_tokens')
    .select('token, used, expires_at')
    .eq('stripe_session_id', sessionId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 });
  }

  if (data.used) {
    return NextResponse.json({ error: 'Token already used' }, { status: 410 });
  }

  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 410 });
  }

  return NextResponse.json({ token: data.token });
}
```

---

### Update existing paid routes (`/api/score`, `/api/rewrite`, `/api/study-plan`, `/api/cover-letter`)

Replace the `x-api-key` header check with token validation. Add this at the top of each paid route handler:

```typescript
import { validateAndConsumeToken } from '@/lib/tokens';

// At the top of POST handler, before any Claude calls:
const token = req.headers.get('x-analysis-token');
if (!token) {
  return NextResponse.json({ error: 'Payment required' }, { status: 402 });
}
const valid = await validateAndConsumeToken(token);
if (!valid) {
  return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
}
```

**Important:** Because `validateAndConsumeToken` marks the token used on first call, and phases 3–4 run in parallel, you need a **multi-use window**. Two options:

**Option A (simpler):** Mint one token per phase (4 tokens per $5 purchase). Update `mintToken` to accept a `phase` label and store 4 rows per session.

**Option B (recommended):** Change token model to `uses_remaining: 4` instead of boolean `used`. Update `validateAndConsumeToken` to decrement and reject at 0.

Use Option B. Update the Supabase schema:

```sql
alter table analysis_tokens
  drop column used,
  add column uses_remaining int not null default 4;
```

Update `validateAndConsumeToken` in `lib/tokens.ts`:

```typescript
export async function validateAndConsumeToken(token: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('analysis_tokens')
    .select('id, uses_remaining, expires_at')
    .eq('token', token)
    .single();

  if (error || !data) return false;
  if (data.uses_remaining <= 0) return false;
  if (new Date(data.expires_at) < new Date()) return false;

  const { error: updateError } = await supabaseAdmin
    .from('analysis_tokens')
    .update({ uses_remaining: data.uses_remaining - 1 })
    .eq('token', token);

  return !updateError;
}
```

---

## Frontend Changes

### Token state in `app/page.tsx`

Add to page state:

```typescript
const [analysisToken, setAnalysisToken] = useState<string | null>(null);
const [paymentState, setPaymentState] = useState<'idle' | 'pending' | 'paid' | 'canceled'>('idle');
```

On mount, check URL params for Stripe redirect:

```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('token');
  const success = params.get('success');
  const canceled = params.get('canceled');

  if (canceled) {
    setPaymentState('canceled');
    window.history.replaceState({}, '', '/');
    return;
  }

  if (success && sessionId) {
    setPaymentState('pending');
    // Poll for token (webhook may be slightly delayed)
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      const res = await fetch('/api/redeem-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        const { token } = await res.json();
        setAnalysisToken(token);
        setPaymentState('paid');
        clearInterval(poll);
        window.history.replaceState({}, '', '/');
      }
      if (attempts >= 10) {
        clearInterval(poll);
        setPaymentState('idle'); // timeout — show error or retry
      }
    }, 1000);
  }
}, []);
```

### Pay button / gate component

When user has completed Phase 1 (has `resumeData`) but has no `analysisToken`, show a pay gate instead of the Analyze button:

```typescript
async function handlePayment() {
  const res = await fetch('/api/create-checkout', { method: 'POST' });
  const { url } = await res.json();
  window.location.href = url;
}
```

### Pass token in paid API calls

Replace `x-api-key` header with `x-analysis-token` in all Phase 2–4 fetch calls:

```typescript
headers: {
  'Content-Type': 'application/json',
  'x-analysis-token': analysisToken!,
}
```

---

## New Component: `components/PayGate.tsx`

Shown after Phase 1 completes, before Phase 2 runs. Replaces the old BYOK modal for the paid flow.

Props:
- `resumeData: ResumeData` — to show a preview of what was parsed
- `onPay: () => void` — triggers Stripe Checkout redirect
- `paymentState: 'idle' | 'pending' | 'canceled'`

Render:
- Summary of what was found in resume (name, skill count, experience count)
- Value prop: what they'll get for $5 (gap analysis, rewrites, cover letter, study plan)
- "$5 one-time — no subscription" prominently
- CTA button: "Unlock Full Analysis →"
- If `paymentState === 'canceled'`: show "Payment canceled — try again" inline
- If `paymentState === 'pending'`: show spinner + "Verifying payment…"

---

## Stripe Dashboard Checklist (you do this)

1. Create account at stripe.com
2. Products → Create product → "Resume Analysis" → One-time price → $5.00 USD
3. Copy the `price_...` ID → `STRIPE_PRICE_ID` env var
4. Copy publishable + secret keys → env vars
5. Webhooks → Add endpoint → your deployed URL + `/api/webhook` → select `checkout.session.completed`
6. Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`
7. For local dev: `npm install -g stripe` then `stripe login` then `stripe listen --forward-to localhost:3000/api/webhook`

---

## Demo Mode

Demo mode should bypass the payment gate entirely. Keep existing demo fixture behavior — if `isDemoMode === true`, skip token checks and use `demoData` fixtures as before. Make sure the PayGate component does not render in demo mode.

---

## Deployment Notes

- Add all new env vars to Vercel before deploying
- Stripe webhook must point to production URL for live payments
- Supabase migration must run before deploying the new routes
- Test full flow locally with Stripe CLI + test mode keys before switching to live keys

---

## File Change Summary

| File | Action |
|---|---|
| `lib/stripe.ts` | Create |
| `lib/supabaseAdmin.ts` | Create |
| `lib/tokens.ts` | Create |
| `app/api/create-checkout/route.ts` | Create |
| `app/api/webhook/route.ts` | Create |
| `app/api/redeem-token/route.ts` | Create |
| `app/api/score/route.ts` | Modify — swap key check for token check |
| `app/api/rewrite/route.ts` | Modify — swap key check for token check |
| `app/api/study-plan/route.ts` | Modify — swap key check for token check |
| `app/api/cover-letter/route.ts` | Modify — swap key check for token check |
| `app/page.tsx` | Modify — token state, mount effect, payment handler, token in fetch headers |
| `components/PayGate.tsx` | Create |
| `components/KeyGate.tsx` (or equivalent) | Remove or repurpose for demo mode only |