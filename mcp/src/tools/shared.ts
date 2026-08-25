import type { ApiCall } from "../types.js";

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

/** Every tool answers with pretty JSON — the model reads it, no client renders it. */
export function ok(payload: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

export function fail(error: unknown): ToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

/** Wraps a handler so a thrown error becomes a tool error instead of killing the server. */
export function guard<Args>(handler: (args: Args) => Promise<ToolResult>) {
  return async (args: Args): Promise<ToolResult> => {
    try {
      return await handler(args);
    } catch (error) {
      return fail(error);
    }
  };
}

const DEFAULT_MAX_BODY_CHARS = 20_000;

/**
 * Response bodies go into a model's context, so an unbounded one is a real
 * cost. Anything past the cap is cut and the result says so rather than
 * silently returning a truncated body that reads as complete.
 */
export function clampBody(value: unknown, maxChars = DEFAULT_MAX_BODY_CHARS): unknown {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  if (serialized === undefined || serialized.length <= maxChars) return value;

  return {
    _truncated: true,
    _originalChars: serialized.length,
    _note: `Body truncated to ${maxChars} chars. Re-run with a larger maxBodyChars, or narrow the request.`,
    preview: serialized.slice(0, maxChars),
  };
}

/** Trims a run's calls down to what is worth reading back. */
export function summarizeCalls(calls: ApiCall[], maxBodyChars?: number) {
  return calls.map((call) => ({
    idx: call.idx,
    method: call.method,
    url: call.url,
    status: call.status,
    statusCode: call.statusCode,
    durationMs: call.duration,
    note: call.note,
    error: call.error,
    requestBody: call.requestBody ?? undefined,
    response: clampBody(call.response, maxBodyChars),
    responseHeaders: call.responseHeaders,
    ...(call.isSse
      ? { sseEvents: (call.sseEvents ?? []).map((e) => ({ type: e.type, data: e.data, id: e.id })) }
      : {}),
  }));
}
