import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getTokenBySessionId, mintToken } from '@/lib/tokens';

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });

  let tokenRecord = await getTokenBySessionId(sessionId);

  if (!tokenRecord) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return NextResponse.json({ error: 'Payment not completed yet' }, { status: 404 });
      }

      await mintToken(session.id);
      tokenRecord = await getTokenBySessionId(session.id);
    } catch (error) {
      console.error('Token redemption lookup failed:', error);
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }
  }

  if (!tokenRecord) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 });
  }

  if (tokenRecord.uses_remaining <= 0) {
    return NextResponse.json({ error: 'Token already used' }, { status: 410 });
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 410 });
  }

  return NextResponse.json({ token: tokenRecord.token });
}
