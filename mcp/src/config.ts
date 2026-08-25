import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Configuration is read from the environment, with the repo's own
 * `.env.local` loaded first as a fallback.
 *
 * Loading `.env.local` means a user who already configured the web app only
 * has to supply credentials (`BULKY_EMAIL` / `BULKY_PASSWORD`) to the MCP
 * server — the project URL and publishable key come from the file the app
 * already uses. Values already present in the real environment win, because
 * `process.loadEnvFile` does not overwrite existing keys.
 */
function loadRepoEnvFile(): string | null {
  const explicit = process.env.BULKY_ENV_FILE;
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    ...(explicit ? [resolve(explicit)] : []),
    // dist/ -> mcp/ -> repo root
    resolve(here, "..", "..", ".env.local"),
    resolve(here, "..", "..", ".env"),
  ];

  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      process.loadEnvFile(path);
      return path;
    } catch {
      // A malformed env file must not stop the server from starting — tools
      // that need credentials report the missing value themselves.
    }
  }
  return null;
}

const loadedEnvFile = loadRepoEnvFile();

export type Config = {
  supabaseUrl: string | undefined;
  supabaseKey: string | undefined;
  email: string | undefined;
  password: string | undefined;
  /** Hard ceiling on a single HTTP call made by any tool. */
  defaultTimeoutMs: number;
  /** Hard ceiling on how many calls one script run may issue. */
  defaultMaxCalls: number;
  /** How long `api.sse()` collects events before the stream is closed. */
  sseWindowMs: number;
  loadedEnvFile: string | null;
};

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config: Config = {
  supabaseUrl: process.env.BULKY_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey:
    process.env.BULKY_SUPABASE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  email: process.env.BULKY_EMAIL,
  password: process.env.BULKY_PASSWORD,
  defaultTimeoutMs: num(process.env.BULKY_TIMEOUT_MS, 30_000),
  defaultMaxCalls: num(process.env.BULKY_MAX_CALLS, 50),
  sseWindowMs: num(process.env.BULKY_SSE_WINDOW_MS, 5_000),
  loadedEnvFile,
};

export const hasSupabaseEnv = (): boolean => Boolean(config.supabaseUrl && config.supabaseKey);
export const hasCredentials = (): boolean => Boolean(config.email && config.password);
