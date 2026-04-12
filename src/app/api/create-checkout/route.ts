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
