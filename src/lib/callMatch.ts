import type { ApiCall } from "./types";

/**
 * Strips the quoting and whitespace that separate the analyzer's raw source
 * expression (`` `\n  {{baseUrl}}/v1/Users\n` ``) from the runtime's evaluated
 * template string (`"\n  {{baseUrl}}/v1/Users\n"`), so the two forms of the
 * same URL argument compare equal.
 */
export function normalizeUrlExpr(expr: string | undefined): string {
  if (!expr) return "";
  return expr.replace(/^["'`]|["'`]$/g, "").replace(/\s+/g, "");
}

/**
 * One-line, quote-free form of a URL for display. Strips a wrapping
 * `` ` ``/`'`/`"` pair, then removes the whitespace a multi-line template
 * literal leaves behind — the newlines and their indentation, and any space
 * hugging a `?`, `&`, `=` or `#` delimiter — while keeping spaces that sit
 * between value tokens (an OData `$filter=name eq 'bob'` stays intact). Unlike
 * {@link normalizeUrlExpr}, which welds the whole string shut for matching.
 */
export function displayUrl(expr: string | undefined): string {
  if (!expr) return "";
  return expr
    .replace(/^\s*["'`]|["'`]\s*$/g, "")
    .replace(/\s*[\r\n]+\s*/g, "")
    .replace(/\s+([?&#])/g, "$1")
    .replace(/([?&=])\s+/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Index of the first entry in `pool` that is the same call as `call` — same
 * method, and either the same resolved url or the same pre-interpolation
 * expression. A `{{var}}` the analyzer can't expand only ever matches on the
 * second key, since the run resolved it and the stub did not.
 *
 * `used` excludes indices already claimed, so a script that fires the same
 * request twice pairs them up in order instead of both landing on the first.
 * Returns -1 when nothing matches.
 */
export function findCallIndex(
  call: ApiCall,
  pool: ApiCall[],
  used: ReadonlySet<number>,
): number {
  const expr = normalizeUrlExpr(call.urlExpr);
  return pool.findIndex(
    (c, i) =>
      !used.has(i) &&
      c.method === call.method &&
      (c.url === call.url ||
        (expr !== "" && normalizeUrlExpr(c.urlExpr) === expr)),
  );
}
