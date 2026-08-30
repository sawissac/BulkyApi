import { NextRequest } from "next/server";

const PROXY_TIMEOUT_MS = 30_000;

/** Presence of this header means the request body is a real multipart/binary
 *  stream to forward as-is — set by `scriptRunner.ts` for `api.form()` /
 *  `api.file()` bodies — rather than the JSON `{ method, url, headers, body }`
 *  envelope the plain-JSON path uses. Target method/headers ride alongside it
 *  since the outer `Content-Type` has to stay whatever the body itself
 *  declares (the multipart boundary, for `FormData`). */
const TARGET_URL_HEADER = "x-proxy-url";
const TARGET_METHOD_HEADER = "x-proxy-method";
const TARGET_HEADERS_HEADER = "x-proxy-headers";

/** Presence of this header routes the request through `proxyPassthrough`
 *  instead of `proxyJson` — set by `scriptRunner.ts` for `api.server.sse()` /
 *  `api.server.stream()` calls, so the upstream body reaches the browser as
 *  it arrives instead of after `respondWithUpstream` buffers the whole thing. */
const STREAM_HEADER = "x-proxy-stream";

export async function POST(req: NextRequest) {
  const targetUrl = req.headers.get(TARGET_URL_HEADER);
  if (targetUrl) return proxyStream(req, targetUrl);
  if (req.headers.get(STREAM_HEADER)) return proxyPassthrough(req);
  return proxyJson(req);
}

/** Streams a `FormData`/`Blob` body straight to `url` — re-encoding a file as
 *  JSON would lose its bytes. Node's `fetch` requires `duplex: "half"` for a
 *  streamed request body; it's missing from the DOM `RequestInit` type this
 *  project's `lib` targets, hence the cast. */
async function proxyStream(req: NextRequest, url: string) {
  try {
    const method = req.headers.get(TARGET_METHOD_HEADER) || "POST";

    let forwardHeaders: Record<string, string> = {};
    const encodedHeaders = req.headers.get(TARGET_HEADERS_HEADER);
    if (encodedHeaders) {
      try {
        forwardHeaders = JSON.parse(decodeURIComponent(encodedHeaders));
      } catch {
        // Malformed envelope header — proceed with no forwarded headers
        // rather than failing the whole upload.
      }
    }

    // The incoming Content-Type carries the multipart boundary the browser
    // generated; it can't be reconstructed from the parsed fields.
    const incomingContentType = req.headers.get("content-type");
    const hasContentType = Object.keys(forwardHeaders).some(
      (k) => k.toLowerCase() === "content-type",
    );
    if (incomingContentType && !hasContentType) {
      forwardHeaders["Content-Type"] = incomingContentType;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: forwardHeaders,
        body: req.body,
        signal: controller.signal,
        duplex: "half",
      } as RequestInit & { duplex: "half" });
    } finally {
      clearTimeout(timeoutId);
    }

    return respondWithUpstream(response);
  } catch (error: unknown) {
    return proxyErrorResponse(error);
  }
}

/** The original path: a JSON envelope describing a plain (non-binary) call. */
async function proxyJson(req: NextRequest) {
  try {
    const { method, url, headers, body } = await req.json();

    const fetchOptions: RequestInit = {
      method,
      headers: headers || {},
    };

    if (body && !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
      fetchOptions.body = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
    fetchOptions.signal = controller.signal;

    let response: Response;
    try {
      response = await fetch(url, fetchOptions);
    } finally {
      clearTimeout(timeoutId);
    }

    return respondWithUpstream(response);
  } catch (error: unknown) {
    return proxyErrorResponse(error);
  }
}

/** SSE/LLM path: a JSON envelope like `proxyJson`, but the upstream body is
 *  piped straight back instead of awaited — the caller (`makeStreamCall` in
 *  `scriptRunner.ts`) reads it chunk by chunk so events render live. Real
 *  upstream status/content-type ride as the actual response status and
 *  `Content-Type` rather than the `{ status, data }` envelope, since there is
 *  no buffered body left to wrap. The connect timeout only guards the initial
 *  `fetch` (headers) — once it resolves, `clearTimeout` lets the stream itself
 *  run unbounded. */
async function proxyPassthrough(req: NextRequest) {
  try {
    const { method, url, headers, body } = await req.json();
    const m = (method || "POST").toUpperCase();
    const sendsBody = body != null && !["GET", "HEAD", "OPTIONS"].includes(m);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
    req.signal.addEventListener("abort", () => controller.abort(), {
      once: true,
    });

    let upstream: Response;
    try {
      upstream = await fetch(url, {
        method: m,
        headers: headers || {},
        body: sendsBody ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const outHeaders = new Headers();
    const ct = upstream.headers.get("content-type");
    if (ct) outHeaders.set("content-type", ct);
    outHeaders.set("cache-control", "no-cache, no-transform");
    outHeaders.set("x-proxy-status", String(upstream.status));

    return new Response(upstream.body, {
      status: upstream.status,
      headers: outHeaders,
    });
  } catch (error: unknown) {
    return proxyErrorResponse(error);
  }
}

/** Both paths hand off to the same upstream `Response` → envelope mapping. */
async function respondWithUpstream(response: Response) {
  const data = await response.text();

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return new Response(
    JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

function proxyErrorResponse(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  const isTimeout = error instanceof Error && error.name === "AbortError";
  return new Response(
    JSON.stringify({
      error: isTimeout ? `Proxy timeout after ${PROXY_TIMEOUT_MS}ms` : msg,
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    },
  );
}
