/**
 * Supabase connection values, read from the environment.
 *
 * Two names are accepted for the same key: Supabase renamed the browser-safe
 * key from "anon" to "publishable" and the dashboard now hands out
 * `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, while existing setups (and older
 * docs) use `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Accepting both means pasting a
 * fresh block from the dashboard does not silently disable sync.
 *
 * Each `process.env.NEXT_PUBLIC_*` lookup is written out in full because Next
 * inlines these by exact textual match at build time — a computed or
 * destructured lookup would come back undefined in the browser.
 *
 * Both values are safe to expose: the publishable key identifies the project,
 * and Row Level Security is what restricts data. A `service_role` key must
 * never be placed in a `NEXT_PUBLIC_*` variable.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when both values are present — otherwise the app runs local-only. */
export const hasSupabaseEnv = (): boolean => Boolean(SUPABASE_URL && SUPABASE_KEY);
