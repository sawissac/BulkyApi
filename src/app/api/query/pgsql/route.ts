import { NextRequest } from "next/server";
import { type Pool, type QueryResult } from "pg";
import {
  clampTimeout,
  errorResponse,
  explainDialFailure,
  getPool,
  messageOf,
  type SslMode,
} from "./pool";

/** `pg` opens raw TCP sockets, so this route can never run on the edge
 *  runtime. Node is already the default; pinning it makes the constraint
 *  explicit next to the driver import. */
export const runtime = "nodejs";

type QueryBody = {
  url?: string;
  sql?: string;
  params?: unknown[];
  ssl?: SslMode;
  timeout?: number;
};

/** Field metadata worth showing in the response panel. The rest of `pg`'s
 *  `FieldDef` (table/column OIDs, format codes) is wire-level detail. */
function fieldsOf(result: QueryResult): { name: string; dataTypeID: number }[] {
  return (result.fields ?? []).map((f) => ({
    name: f.name,
    dataTypeID: f.dataTypeID,
  }));
}

function summarize(result: QueryResult) {
  return {
    command: result.command,
    rowCount: result.rowCount,
    rows: result.rows,
    fields: fieldsOf(result),
  };
}

/**
 * Runs one raw SQL statement (or a batch of them) against Postgres on behalf
 * of `api.query.pgsql` in `scriptRunner.ts`.
 *
 * The browser can't speak the Postgres wire protocol, so unlike `api.get` —
 * which only detours through `/api/proxy` when CORS demands it — every query
 * has to land here. `sql` is executed verbatim: this is a database client, and
 * a raw query feature that sanitized the query would have no purpose. Values
 * still belong in `params` (`$1`, `$2`, ...), which the driver binds out of
 * band rather than splicing into the statement.
 *
 * Both the connection string and the statement come from the caller, so this
 * route is exactly as trusted as the person running the app — the same
 * position `/api/proxy` is in, and the reason both sit behind the signed-in
 * gate in `proxy.ts` whenever a Supabase project is configured.
 *
 * `./test/route.ts` is the sibling that only dials — the DB pane's **Test
 * connection** goes there rather than sending a throwaway statement here.
 */
export async function POST(req: NextRequest) {
  let body: QueryBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Malformed request body", 400);
  }

  const { url, sql, params, ssl, timeout } = body;
  if (!url) return errorResponse("No Postgres connection string", 400);
  if (!sql || !sql.trim()) return errorResponse("Empty SQL statement", 400);

  const statementTimeout = clampTimeout(timeout);

  const t0 = Date.now();
  let pool: Pool;
  try {
    pool = getPool(url, ssl);
  } catch (error: unknown) {
    return errorResponse(messageOf(error), 500);
  }

  const client = await pool.connect().catch((error: unknown) => error as Error);
  if (client instanceof Error) {
    const hint = await explainDialFailure(url, client);
    return errorResponse(hint ?? messageOf(client), 502, client);
  }

  try {
    // Server-side guard: aborting the browser's fetch tears down this route's
    // response but not the statement already running in Postgres, so the only
    // thing that actually stops a runaway query is the backend's own timeout.
    await client.query(`SET statement_timeout = ${statementTimeout}`);

    // Passing `params` switches `pg` to the extended query protocol, which
    // accepts exactly one statement; the simple protocol (text only) runs a
    // whole batch and answers with an array of results.
    const result = (
      params && params.length > 0
        ? await client.query(sql, params)
        : await client.query(sql)
    ) as QueryResult | QueryResult[];

    const duration = Date.now() - t0;

    if (Array.isArray(result)) {
      const last = result[result.length - 1];
      return Response.json({
        ...summarize(last),
        statements: result.map(summarize),
        duration,
      });
    }

    return Response.json({ ...summarize(result), duration });
  } catch (error: unknown) {
    return errorResponse(messageOf(error), 400, error);
  } finally {
    client.release();
  }
}

