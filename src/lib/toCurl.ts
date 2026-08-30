import type { ApiCall } from "./types";
import { isBodySummary } from "./requestBody";

/** Single-quote a value for a POSIX shell — the only safe way to carry
 *  arbitrary JSON, headers and URLs on one command line. `'` is closed,
 *  escaped, reopened. */
function shq(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** Collapse newlines and their surrounding indentation out of a URL — a
 *  multi-line OData request string is written for readability, but a URL on a
 *  `curl` line must be one unbroken token. Inner single spaces are left alone. */
function flattenUrl(url: string): string {
  return url.replace(/\s*\n\s*/g, "").trim();
}

/**
 * Renders a built {@link ApiCall} as a runnable `curl` command — the reverse of
 * the cURL import. The resolved URL is flattened to one line first (a multi-line
 * OData request string breaks a `curl` command otherwise). Uses the request
 * headers actually sent,
 * and the body: JSON as `-d`, an `api.form()` body as `-F` fields (curl grows
 * its own multipart boundary, so any forwarded `Content-Type` is dropped), an
 * `api.file()` body as `--data-binary`. SSE calls come out as a streaming
 * request (`-N`) — GET for a plain `api.sse()`, or the real verb (e.g. `-X
 * POST`, with `-d` for its body) for an `api.stream()` call. A file field
 * reads `@<name>` — a placeholder path, since the actual bytes never
 * round-trip into the call record; point it at the real file to replay the
 * command.
 */
export function callToCurl(call: ApiCall): string {
  // A plain GET `api.sse()` call is recorded with method "SSE" (see
  // `scriptRunner.ts`); any other stream verb is recorded as itself.
  const method =
    call.method.toUpperCase() === "SSE" ? "GET" : call.method.toUpperCase();
  const lines: string[] = [`curl -X ${method} ${shq(flattenUrl(call.url))}`];

  if (call.isSse) lines.push(`  -N`);

  const summary = isBodySummary(call.requestBody) ? call.requestBody : null;
  const isMultipart = summary?.kind === "multipart";

  for (const [key, value] of Object.entries(call.requestHeaders ?? {})) {
    if (isMultipart && key.toLowerCase() === "content-type") continue;
    lines.push(`  -H ${shq(`${key}: ${value}`)}`);
  }

  if (summary?.kind === "multipart") {
    for (const part of summary.parts) {
      const field = part.file
        ? `${part.key}=@${part.file.name};type=${part.file.type}`
        : `${part.key}=${part.value}`;
      lines.push(`  -F ${shq(field)}`);
    }
  } else if (summary?.kind === "binary") {
    const hasContentType = Object.keys(call.requestHeaders ?? {}).some(
      (k) => k.toLowerCase() === "content-type",
    );
    if (!hasContentType) {
      lines.push(`  -H ${shq(`Content-Type: ${summary.type}`)}`);
    }
    lines.push(`  --data-binary ${shq(`@${summary.name}`)}`);
  } else {
    const sendsBody =
      call.requestBody != null && !["GET", "HEAD", "OPTIONS"].includes(method);
    if (sendsBody) {
      const body =
        typeof call.requestBody === "string"
          ? call.requestBody
          : JSON.stringify(call.requestBody);
      lines.push(`  -d ${shq(body)}`);
    }
  }

  return lines.join(" \\\n");
}
