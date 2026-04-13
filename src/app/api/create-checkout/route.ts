import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { RESUME_ANALYSIS_PRODUCT } from '@/lib/stripePayments';

export async function POST(req: NextRequest) {
  const origin = req.nextUrl.origin;

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    ui_mode: 'embedded_page',
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    return_url: `${origin}/app?token={CHECKOUT_SESSION_ID}&success=true`,
    metadata: {
      product: RESUME_ANALYSIS_PRODUCT,
    },
  });

  return NextResponse.json({ clientSecret: session.client_secret });
}
