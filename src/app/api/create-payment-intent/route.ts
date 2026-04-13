import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getResumeAnalysisPrice, RESUME_ANALYSIS_PRODUCT } from '@/lib/stripePayments';

export async function POST() {
  const price = await getResumeAnalysisPrice();

  const paymentIntent = await getStripe().paymentIntents.create({
    amount: price.amount,
    currency: price.currency,
    metadata: {
      product: RESUME_ANALYSIS_PRODUCT,
      price_id: price.priceId,
    },
    automatic_payment_methods: { enabled: true },
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  });
}
