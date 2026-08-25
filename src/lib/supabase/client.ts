import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './db-types';
import { SUPABASE_KEY, SUPABASE_URL, hasSupabaseEnv } from './env';

export type BulkySupabase = SupabaseClient<Database>;

let _client: BulkySupabase | null = null;

/**
 * Returns null when the Supabase env vars are absent, which is the signal the
 * rest of the app uses to stay in local-only mode. Every call site treats a
 * null client as "no sync", so the app runs unchanged with no Supabase project
 * configured.
 */
export function getSupabaseBrowser(): BulkySupabase | null {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  if (!_client) _client = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_KEY);
  return _client;
}

export const isSupabaseConfigured = hasSupabaseEnv;
