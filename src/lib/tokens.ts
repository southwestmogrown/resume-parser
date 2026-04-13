import { randomBytes } from 'crypto';
import { getSupabaseAdmin } from './supabaseAdmin';

export interface AnalysisTokenRecord {
  token: string;
  uses_remaining: number;
  expires_at: string;
}

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function getTokenBySessionId(stripeSessionId: string): Promise<AnalysisTokenRecord | null> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('analysis_tokens')
    .select('token, uses_remaining, expires_at')
    .eq('stripe_session_id', stripeSessionId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch analysis token:', error);
    return null;
  }

  if (!data) return null;
  return data;
}

export async function mintToken(stripeSessionId: string): Promise<{ token: string; expiresAt: string }> {
  const supabaseAdmin = getSupabaseAdmin();
  const existingToken = await getTokenBySessionId(stripeSessionId);
  if (existingToken) return { token: existingToken.token, expiresAt: existingToken.expires_at };

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabaseAdmin.from('analysis_tokens').insert({
    token,
    stripe_session_id: stripeSessionId,
    uses_remaining: 4,
    expires_at: expiresAt,
  });

  if (error) {
    if (error.code === '23505') {
      const duplicateToken = await getTokenBySessionId(stripeSessionId);
      if (duplicateToken) return { token: duplicateToken.token, expiresAt: duplicateToken.expires_at };

      throw new Error('Duplicate token detected, but the existing token record could not be loaded');
    }

    throw new Error(`Failed to mint token: ${error.message}`);
  }

  return { token, expiresAt };
}

export async function validateAndConsumeToken(token: string): Promise<boolean> {
  const supabaseAdmin = getSupabaseAdmin();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data, error } = await supabaseAdmin
      .from('analysis_tokens')
      .select('id, uses_remaining, expires_at')
      .eq('token', token)
      .single();

    if (error || !data) return false;
    if (data.uses_remaining <= 0) return false;
    if (new Date(data.expires_at) < new Date()) return false;

    const { data: updatedToken, error: updateError } = await supabaseAdmin
      .from('analysis_tokens')
      .update({ uses_remaining: data.uses_remaining - 1 })
      .eq('token', token)
      .eq('uses_remaining', data.uses_remaining)
      .select('uses_remaining')
      .maybeSingle();

    if (!updateError && updatedToken?.uses_remaining === data.uses_remaining - 1) {
      return true;
    }
  }

  return false;
}

export async function validateTokenOnly(token: string): Promise<boolean> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('analysis_tokens')
    .select('uses_remaining, expires_at')
    .eq('token', token)
    .single();

  if (error || !data) return false;
  if (data.uses_remaining <= 0) return false;
  if (new Date(data.expires_at) < new Date()) return false;

  return true;
}

/**
 * Star-prep access check. Returns 'consume' (first use, decrement + mark),
 * 'allow' (already unlocked, just check expiry), or 'deny'.
 *
 * Requires the `star_prep_unlocked` boolean column on analysis_tokens.
 * Migration: ALTER TABLE analysis_tokens ADD COLUMN star_prep_unlocked boolean NOT NULL DEFAULT false;
 */
export async function checkStarPrepAccess(
  token: string
): Promise<'consume' | 'allow' | 'deny'> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('analysis_tokens')
    .select('id, uses_remaining, expires_at, star_prep_unlocked')
    .eq('token', token)
    .single();

  if (error || !data) return 'deny';
  if (new Date(data.expires_at) < new Date()) return 'deny';

  // Already unlocked — they've paid, they get ongoing access.
  if (data.star_prep_unlocked) return 'allow';

  // First activation — must have a use to spend.
  if (data.uses_remaining <= 0) return 'deny';

  return 'consume';
}

export async function activateStarPrep(token: string): Promise<boolean> {
  const supabaseAdmin = getSupabaseAdmin();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data, error } = await supabaseAdmin
      .from('analysis_tokens')
      .select('id, uses_remaining')
      .eq('token', token)
      .single();

    if (error || !data || data.uses_remaining <= 0) return false;

    const { data: updatedToken, error: updateError } = await supabaseAdmin
      .from('analysis_tokens')
      .update({
        uses_remaining: data.uses_remaining - 1,
        star_prep_unlocked: true,
      })
      .eq('token', token)
      .eq('uses_remaining', data.uses_remaining)
      .eq('star_prep_unlocked', false)
      .select('uses_remaining, star_prep_unlocked')
      .maybeSingle();

    if (
      !updateError &&
      updatedToken?.uses_remaining === data.uses_remaining - 1 &&
      updatedToken.star_prep_unlocked === true
    ) {
      return true;
    }
  }

  return false;
}
