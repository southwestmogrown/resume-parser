import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getTokenBySessionId, mintToken } from '@/lib/tokens';

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });

  let tokenRecord = await getTokenBySessionId(sessionId);

  if (!tokenRecord) {
    let session;

    try {
      session = await getStripe().checkout.sessions.retrieve(sessionId);
    } catch (error) {
      console.error('Token redemption lookup failed:', error);
      return NextResponse.json(
        { error: 'Unable to verify payment with Stripe. Please try again or contact support.' },
        { status: 502 }
      );
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed yet' }, { status: 402 });
    }

    try {
      await mintToken(session.id);
      tokenRecord = await getTokenBySessionId(session.id);
    } catch (error) {
      console.error('Token creation failed after payment verification:', error);
      return NextResponse.json(
        { error: 'Payment verified, but token creation failed. Please try again.' },
        { status: 502 }
      );
    }
  }

  if (!tokenRecord) {
    return NextResponse.json({ error: 'Token could not be created' }, { status: 500 });
  }

  if (tokenRecord.uses_remaining <= 0) {
    return NextResponse.json({ error: 'Token already used' }, { status: 410 });
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 410 });
  }

  return NextResponse.json({ token: tokenRecord.token });
}
