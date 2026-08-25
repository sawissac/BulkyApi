import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './db-types';
import { SUPABASE_KEY, SUPABASE_URL } from './env';

/**
 * Per-request Supabase client for Server Components, Server Functions, and
 * Route Handlers. Never cache or share the returned client across requests —
 * it is bound to one request's cookie jar.
 *
 * Returns null when Supabase env vars are absent (local-only mode).
 */
export async function getSupabaseServer() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies; src/proxy.ts refreshes the
          // session on every request, so a failure here is safe to swallow.
        }
      },
    },
  });
}
