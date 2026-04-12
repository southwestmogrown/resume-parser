import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export async function POST(_req: NextRequest) {
  const price = await getStripe().prices.retrieve(process.env.STRIPE_PRICE_ID!);

  const paymentIntent = await getStripe().paymentIntents.create({
    amount: price.unit_amount!,
    currency: price.currency,
    metadata: { product: 'resume_analysis' },
    automatic_payment_methods: { enabled: true },
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  });
}
