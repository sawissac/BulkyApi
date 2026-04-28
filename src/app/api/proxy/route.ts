import { NextRequest } from "next/server";

const PROXY_TIMEOUT_MS = 30_000;

export async function POST(req: NextRequest) {
  try {
    const { method, url, headers, body } = await req.json();

    const fetchOptions: RequestInit = {
      method,
      headers: headers || {},
    };

    if (body && !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
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

    const data = await response.text();

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return new Response(JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    return new Response(JSON.stringify({ error: isTimeout ? `Proxy timeout after ${PROXY_TIMEOUT_MS}ms` : msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
