import { NextRequest } from "next/server";

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

    const response = await fetch(url, fetchOptions);
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
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
