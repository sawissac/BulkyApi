import { Pool, type PoolConfig } from "pg";

/**
 * Connection plumbing shared by the two Postgres routes — `./route.ts` (run a
 * statement) and `./test/route.ts` (dial and report). Kept beside them rather
 * than in `src/lib` because it imports `pg`, which must never be reachable
 * from a client bundle. Only a `route.ts` is a route, so this file is compiled
 * only where it is imported.
 */

const CONNECT_TIMEOUT_MS = 10_000;

export const DEFAULT_STATEMENT_TIMEOUT_MS = 30_000;

/** Ceiling on a caller's `timeout` — a script can shorten the statement
 *  timeout but not lift it past this, so a runaway query can't pin a pooled
 *  connection for the life of the dev server. */
export const MAX_STATEMENT_TIMEOUT_MS = 300_000;

/** How the caller asked for TLS: `true` verifies the server certificate,
 *  `"no-verify"` encrypts without verifying it (what a managed Postgres
 *  behind a self-signed pooler cert needs), and omitting it leaves the
 *  decision to `sslmode` in the connection string. */
export type SslMode = boolean | "no-verify";

/** One `pg` pool per distinct connection, kept across requests — a fresh pool
 *  per query would pay the TCP + TLS + auth handshake every time, which for a
 *  hosted database is most of the round trip. `allowExitOnIdle` lets the Node
 *  process still shut down cleanly with pools cached here. */
const pools = new Map<string, Pool>();

function poolKey(connectionString: string, ssl: SslMode | undefined): string {
  return `${connectionString}::${String(ssl ?? "")}`;
}

function sslConfig(ssl: SslMode | undefined): PoolConfig["ssl"] {
  if (ssl === undefined) return undefined;
  if (ssl === "no-verify") return { rejectUnauthorized: false };
  return ssl ? { rejectUnauthorized: true } : false;
}

/** The pool for this connection, created on first use. Both routes share the
 *  cache, so testing a connection in the DB pane warms the very pool the next
 *  query will borrow from. */
export function getPool(connectionString: string, ssl: SslMode | undefined): Pool {
  const key = poolKey(connectionString, ssl);
  const existing = pools.get(key);
  if (existing) return existing;

  const pool = new Pool({
    connectionString,
    ssl: sslConfig(ssl),
    max: 4,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    allowExitOnIdle: true,
  });
  // A pool that never listens for `error` crashes the process when an idle
  // connection is dropped by the server (or by a laptop sleeping).
  pool.on("error", () => {});
  pools.set(key, pool);
  return pool;
}

/** A caller's `timeout` forced to a finite integer inside the allowed range —
 *  it is interpolated into a `SET`, which takes no bind parameters, so it is
 *  never trusted as sent. */
export function clampTimeout(timeout: unknown): number {
  const requested = Number(timeout);
  return Math.min(
    Math.max(
      1,
      Math.round(
        Number.isFinite(requested) ? requested : DEFAULT_STATEMENT_TIMEOUT_MS,
      ),
    ),
    MAX_STATEMENT_TIMEOUT_MS,
  );
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Name-resolution failures worth a second look. `ENOTFOUND` is the one that
 *  misleads: the OS resolver reports it both for a host that does not exist and
 *  for one that publishes only an address family this machine cannot use. */
const DNS_FAILURES = new Set(["ENOTFOUND", "EAI_AGAIN", "ENETUNREACH"]);

const DNS_PROBE_TIMEOUT_MS = 2_000;

async function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise<T>((resolve) =>
      setTimeout(() => resolve(fallback), DNS_PROBE_TIMEOUT_MS),
    ),
  ]);
}

/**
 * A sentence explaining a dial that never reached the server, or null when the
 * driver's own message already says everything.
 *
 * `dns.lookup` (what the driver calls) goes through the OS resolver, which
 * hides an IPv6 address from a machine with no IPv6 route and reports the host
 * as simply not found. `dns.resolve*` queries DNS directly, so asking both
 * separates "no such host" from "host this machine cannot reach" — the
 * difference between a typo and a network that needs a different endpoint.
 * Managed Postgres that is IPv6-only on its direct hostname and IPv4 on its
 * pooler is the common way to meet this.
 */
export async function explainDialFailure(
  connectionString: string,
  error: unknown,
): Promise<string | null> {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code !== "string" || !DNS_FAILURES.has(code)) return null;

  let host: string;
  try {
    host = new URL(connectionString).hostname;
  } catch {
    return null;
  }
  if (!host) return null;

  const { resolve4, resolve6 } = await import("node:dns/promises");
  const [v4, v6] = await Promise.all([
    withTimeout(resolve4(host), [] as string[]),
    withTimeout(resolve6(host), [] as string[]),
  ]);

  if (v6.length > 0 && v4.length === 0) {
    return `${host} publishes only an IPv6 address, which this machine has no route to. Use the host's IPv4 endpoint — on a managed Postgres that is usually its connection pooler, on a different hostname and often a different port and username.`;
  }
  if (v4.length === 0 && v6.length === 0) {
    return `${host} does not resolve. Check the hostname, or whether the database is paused.`;
  }
  return `${host} resolves but could not be reached. Check the port and any firewall between here and it.`;
}

/** Postgres error fields worth carrying back to the caller — `code` is the
 *  SQLSTATE, and `position` is the 1-based offset into the statement, which is
 *  what makes a syntax error findable. */
export function errorResponse(message: string, status: number, error?: unknown) {
  const e = (error ?? {}) as Record<string, unknown>;
  return Response.json(
    {
      error: message,
      code: typeof e.code === "string" ? e.code : undefined,
      detail: typeof e.detail === "string" ? e.detail : undefined,
      hint: typeof e.hint === "string" ? e.hint : undefined,
      position: typeof e.position === "string" ? Number(e.position) : undefined,
    },
    { status },
  );
}
