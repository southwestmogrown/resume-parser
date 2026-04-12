import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { mintToken } from '@/lib/tokens';

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
