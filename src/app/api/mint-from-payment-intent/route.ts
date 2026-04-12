import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { mintToken } from '@/lib/tokens';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { paymentIntentId } = body as { paymentIntentId?: string };

  if (!paymentIntentId) {
    return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400 });
  }

  const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== 'succeeded') {
    return NextResponse.json({ error: 'Payment not completed' }, { status: 402 });
  }

  const token = await mintToken(paymentIntentId);
  return NextResponse.json({ token });
}
