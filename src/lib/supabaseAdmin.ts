import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseAdminClient: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase admin environment variables are not set');
  }

  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(url, serviceRoleKey);
  }

  return supabaseAdminClient;
}
