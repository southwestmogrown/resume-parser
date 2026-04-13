import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { mintToken } from '@/lib/tokens';
import { getResumeAnalysisPrice, isExpectedResumeAnalysisPayment } from '@/lib/stripePayments';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown webhook error';
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const expectedPrice = await getResumeAnalysisPrice();
    if (
      session.payment_status !== 'paid' ||
      !isExpectedResumeAnalysisPayment(
        {
          amount: session.amount_total,
          currency: session.currency,
          metadata: session.metadata,
        },
        expectedPrice
      )
    ) {
      return NextResponse.json({ error: 'Webhook payment verification failed' }, { status: 400 });
    }

    try {
      await mintToken(session.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown token mint error';
      console.error('Token mint failed:', message);
      return NextResponse.json({ error: 'Token mint failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
