import type { DbConnection, DbSsl } from "./sampleData";

export const DEFAULT_PG_PORT = 5432;

/** A blank connection pointing at a local Postgres — what the DB pane's "add"
 *  starts from, so the common case is a name and a database away from working. */
export function newConnection(id: string, name: string): DbConnection {
  return {
    id,
    name,
    host: "localhost",
    port: DEFAULT_PG_PORT,
    database: "postgres",
    user: "postgres",
    password: "",
    ssl: "",
  };
}

/**
 * Rebuilds the DSN the `pg` driver connects with. The user and password are
 * percent-encoded — a password with an `@` or `/` in it would otherwise split
 * the URL in the wrong place and connect somewhere unintended.
 *
 * `sslmode` is deliberately left off: TLS travels beside the DSN as the route's
 * own `ssl` option (see {@link sslOption}), so one field decides it rather than
 * two that can disagree.
 */
export function connectionUrl(c: DbConnection): string {
  const auth = c.user
    ? `${encodeURIComponent(c.user)}${c.password ? `:${encodeURIComponent(c.password)}` : ""}@`
    : "";
  const port = c.port || DEFAULT_PG_PORT;
  const database = c.database ? `/${encodeURIComponent(c.database)}` : "";
  return `postgres://${auth}${c.host}:${port}${database}`;
}

/** The connection's TLS choice in the form `/api/query/pgsql` takes. `''` maps
 *  to `undefined`, which leaves the decision to the driver. */
export function sslOption(c: DbConnection): boolean | "no-verify" | undefined {
  if (c.ssl === "require") return true;
  if (c.ssl === "no-verify") return "no-verify";
  return undefined;
}

/** `postgres://user@host:port/db` — the password dropped. What the DB pane
 *  shows under a row and what a call record stores as its target. */
export function describeConnection(c: DbConnection): string {
  const user = c.user ? `${c.user}@` : "";
  return `postgres://${user}${c.host}:${c.port || DEFAULT_PG_PORT}/${c.database}`;
}

/** Maps a `sslmode=` query parameter onto the three states the pane offers.
 *  `verify-ca`/`verify-full` are stricter than `require` but all three verify,
 *  so they collapse to the same choice here. */
function sslFromMode(mode: string | null): DbSsl {
  if (mode === "require" || mode === "verify-ca" || mode === "verify-full") {
    return "require";
  }
  if (mode === "no-verify" || mode === "prefer" || mode === "allow") {
    return "no-verify";
  }
  return "";
}

/**
 * Parses a pasted `postgres://` / `postgresql://` DSN into the pane's fields —
 * the form a hosted provider hands out. Returns null for anything that isn't
 * one, so the caller can leave the form untouched rather than blanking it.
 */
export function parseConnectionUrl(
  text: string,
): Omit<DbConnection, "id" | "name"> | null {
  const raw = text.trim();
  if (!raw) return null;

  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "postgres:" && u.protocol !== "postgresql:") return null;

  return {
    host: u.hostname,
    port: Number(u.port) || DEFAULT_PG_PORT,
    database: decodeURIComponent(u.pathname.replace(/^\//, "")),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    ssl: sslFromMode(u.searchParams.get("sslmode")),
  };
}

/** Whether a connection has enough filled in to be worth dialling. The pane
 *  disables Test and the runner refuses to use one that fails this, rather than
 *  sending a half-built DSN at a stranger's host. */
export function isConnectionUsable(c: DbConnection): boolean {
  return Boolean(c.host.trim() && c.database.trim());
}
