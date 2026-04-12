import { randomBytes } from 'crypto';
import { supabaseAdmin } from './supabaseAdmin';

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function mintToken(stripeSessionId: string): Promise<string> {
  const token = generateToken();
  const { error } = await supabaseAdmin.from('analysis_tokens').insert({
    token,
    stripe_session_id: stripeSessionId,
  });
  if (error) throw new Error(`Failed to mint token: ${error.message}`);
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
