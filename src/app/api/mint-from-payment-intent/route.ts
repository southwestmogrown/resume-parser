import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { mintToken } from '@/lib/tokens';
import { getResumeAnalysisPrice, isExpectedResumeAnalysisPayment } from '@/lib/stripePayments';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { paymentIntentId } = body as { paymentIntentId?: string };

  if (!paymentIntentId) {
    return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400 });
  }

  const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
  const expectedPrice = await getResumeAnalysisPrice();

  if (paymentIntent.status !== 'succeeded') {
    return NextResponse.json({ error: 'Payment not completed' }, { status: 402 });
  }

  if (!isExpectedResumeAnalysisPayment(paymentIntent, expectedPrice)) {
    return NextResponse.json({ error: 'Payment does not match the configured analysis price' }, { status: 400 });
  }

  const { token, expiresAt } = await mintToken(paymentIntentId);
  return NextResponse.json({ token, expiresAt });
}
