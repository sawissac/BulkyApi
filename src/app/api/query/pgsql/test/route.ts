import { NextRequest } from "next/server";
import {
  clampTimeout,
  errorResponse,
  explainDialFailure,
  getPool,
  messageOf,
  type SslMode,
} from "../pool";

/** Same constraint as the sibling query route: `pg` opens raw TCP sockets, so
 *  this can never run on the edge runtime. */
export const runtime = "nodejs";

/** A dial should fail fast — a wrong host or a blocked port is the common
 *  outcome here, and the pane is waiting on it with a spinner. */
const DEFAULT_TEST_TIMEOUT_MS = 10_000;

type TestBody = {
  url?: string;
  ssl?: SslMode;
  timeout?: number;
};

/** What the connection turned out to be, once reached. Read back from the
 *  server rather than echoed from the request, so it reports where the DSN
 *  actually landed — a pooler that rewrites the database, or a role different
 *  from the one in the URL, shows up here instead of silently later. */
type Identity = {
  version: string;
  database: string;
  user: string;
};

/** Whether the connection is actually encrypted, which the request can only
 *  ask for and not confirm. `pg_stat_ssl` is unreadable on some managed
 *  providers and absent from a connection pooler in transaction mode, so this
 *  is best effort — null means "could not tell", never "not encrypted". */
async function detectSsl(
  client: { query: (sql: string) => Promise<{ rows: { ssl?: boolean }[] }> },
): Promise<boolean | null> {
  try {
    const res = await client.query(
      "select ssl from pg_stat_ssl where pid = pg_backend_pid()",
    );
    const value = res.rows[0]?.ssl;
    return typeof value === "boolean" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Dials a Postgres connection and reports what answered — the DB pane's **Test
 * connection** button.
 *
 * Deliberately a route of its own rather than a `select 1` sent to the sibling
 * query route: a test is not a query. It takes no `sql` at all, so the pane has
 * no statement to compose and this endpoint has none to run on a caller's
 * behalf; what it runs is fixed here. In exchange it can answer the questions a
 * `select 1` cannot — which server version answered, which database and role
 * the DSN actually resolved to, and whether the link is really encrypted.
 *
 * Both routes share `../pool`, so a successful test leaves a warm pool for the
 * first real query to borrow rather than paying the handshake twice.
 *
 * The connection string still comes from the caller, so this sits behind the
 * same signed-in gate in `proxy.ts` as every other `/api/*` route.
 */
export async function POST(req: NextRequest) {
  let body: TestBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Malformed request body", 400);
  }

  const { url, ssl, timeout } = body;
  if (!url) return errorResponse("No Postgres connection string", 400);

  const statementTimeout = clampTimeout(timeout ?? DEFAULT_TEST_TIMEOUT_MS);

  const t0 = Date.now();
  let client;
  try {
    client = await getPool(url, ssl).connect();
  } catch (error: unknown) {
    // Everything that keeps the dial from landing — bad host, refused port,
    // rejected credentials, a certificate the client won't accept — arrives
    // here rather than as a query error. A name-resolution failure gets a
    // second, more specific sentence where one can be worked out.
    const hint = await explainDialFailure(url, error);
    return errorResponse(hint ?? messageOf(error), 502, error);
  }

  const connectedMs = Date.now() - t0;

  try {
    await client.query(`SET statement_timeout = ${statementTimeout}`);
    const res = await client.query<Identity>(
      `select current_setting('server_version') as version,
              current_database() as database,
              current_user as user`,
    );
    const identity = res.rows[0];

    return Response.json({
      ok: true,
      /** Time to a usable connection — the number worth showing, since a warm
       *  pool answers in single digits and a cold hosted dial in hundreds. */
      connectedMs,
      totalMs: Date.now() - t0,
      version: identity?.version ?? "",
      database: identity?.database ?? "",
      user: identity?.user ?? "",
      encrypted: await detectSsl(client),
    });
  } catch (error: unknown) {
    // Reached the server but could not ask it anything — a role without
    // permission to run the identity query, mostly.
    return errorResponse(messageOf(error), 400, error);
  } finally {
    client.release();
  }
}
