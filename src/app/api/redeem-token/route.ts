import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('analysis_tokens')
    .select('token, used, expires_at')
    .eq('stripe_session_id', sessionId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 });
  }

  if (data.used) {
    return NextResponse.json({ error: 'Token already used' }, { status: 410 });
  }

  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 410 });
  }

  return NextResponse.json({ token: data.token });
}
