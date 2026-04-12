import { randomBytes } from 'crypto';
import { supabaseAdmin } from './supabaseAdmin';

export interface AnalysisTokenRecord {
  token: string;
  uses_remaining: number;
  expires_at: string;
}

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function getTokenBySessionId(stripeSessionId: string): Promise<AnalysisTokenRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('analysis_tokens')
    .select('token, uses_remaining, expires_at')
    .eq('stripe_session_id', stripeSessionId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function mintToken(stripeSessionId: string): Promise<string> {
  const existingToken = await getTokenBySessionId(stripeSessionId);
  if (existingToken) return existingToken.token;

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabaseAdmin.from('analysis_tokens').insert({
    token,
    stripe_session_id: stripeSessionId,
    uses_remaining: 4,
    expires_at: expiresAt,
  });

  if (error) {
    const duplicateToken = await getTokenBySessionId(stripeSessionId);
    if (duplicateToken) return duplicateToken.token;

    throw new Error(`Failed to mint token: ${error.message}`);
  }

  return token;
}

export async function validateAndConsumeToken(token: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('analysis_tokens')
    .select('id, uses_remaining, expires_at')
    .eq('token', token)
    .single();

  if (error || !data) return false;
  if (data.uses_remaining <= 0) return false;
  if (new Date(data.expires_at) < new Date()) return false;

  const { error: updateError } = await supabaseAdmin
    .from('analysis_tokens')
    .update({ uses_remaining: data.uses_remaining - 1 })
    .eq('token', token);

  return !updateError;
}
