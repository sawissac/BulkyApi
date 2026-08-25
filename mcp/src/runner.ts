import { createContext, runInContext } from "node:vm";
import { config } from "./config.js";
import type { ApiCall, AuthInfo, LogEntry, SseEvent } from "./types.js";

type CallOpts = {
  auth?: {
    type: string;
    token?: string;
    username?: string;
    password?: string;
    header?: string;
    key?: string;
  };
  headers?: Record<string, string>;
};

export type RunOptions = {
  /** Per-call ceiling. Falls back to `BULKY_TIMEOUT_MS`. */
  timeoutMs?: number;
  /** Ceiling for the whole script, including time between calls. */
  scriptTimeoutMs?: number;
  /** Refuses to issue more than this many calls, so a runaway loop stops. */
  maxCalls?: number;
  /** How long an `api.sse()` stream is read before it is closed. */
  sseWindowMs?: number;
};

export type RunResult = {
  calls: ApiCall[];
  logs: LogEntry[];
  extractedVars: Record<string, string>;
  aborted: boolean;
  error: string | null;
};

function buildAuthHeaders(
  opts: CallOpts,
  envVars: Record<string, string>,
): { authHeaders: Record<string, string>; authInfo: AuthInfo } {
  const authHeaders: Record<string, string> = {};
  let authInfo: AuthInfo = null;

  if (opts.auth) {
    const a = opts.auth;
    if (a.type === "bearer" && a.token) {
      authHeaders["Authorization"] = `Bearer ${a.token}`;
      authInfo = { type: "Bearer Token", token: a.token };
    } else if (a.type === "basic" && a.username && a.password) {
      const encoded = Buffer.from(`${a.username}:${a.password}`).toString("base64");
      authHeaders["Authorization"] = `Basic ${encoded}`;
      authInfo = { type: "Basic Auth", username: a.username };
    } else if (a.type === "apikey" && a.key) {
      const header = a.header || "X-API-Key";
      authHeaders[header] = a.key;
      authInfo = { type: "API Key", header, key: a.key };
    }
  } else if (envVars.token) {
    authHeaders["Authorization"] = `Bearer ${envVars.token}`;
    authInfo = { type: "Bearer (env)", token: envVars.token };
  }

  return { authHeaders, authInfo };
}

/**
 * Runs a BulkyApi automation script and returns everything it did.
 *
 * This is the headless twin of the browser runner in `src/lib/scriptRunner.ts`
 * and keeps the same `api.*` surface, so a script saved from the app runs here
 * unchanged. Two differences follow from there being no browser:
 *
 * - `api.server.*` is an alias of `api.*`. The app routes those through
 *   `/api/proxy` only to escape CORS; a Node process has no such restriction
 *   and calls the target directly.
 * - There is no step/pause. `onUpdate` streaming is replaced by collecting the
 *   final call list, which is what an MCP tool result carries.
 *
 * The script runs in a `node:vm` context holding only the globals it needs.
 * That is isolation, not a security boundary — Node documents `vm` as unsafe
 * for untrusted code, and these scripts are the user's own.
 */
export async function runScript(
  code: string,
  envVars: Record<string, string>,
  options: RunOptions = {},
): Promise<RunResult> {
  const timeoutMs = options.timeoutMs ?? config.defaultTimeoutMs;
  const scriptTimeoutMs = options.scriptTimeoutMs ?? timeoutMs * 4;
  const maxCalls = options.maxCalls ?? config.defaultMaxCalls;
  const sseWindowMs = options.sseWindowMs ?? config.sseWindowMs;

  const calls: ApiCall[] = [];
  const logs: LogEntry[] = [];
  const mutableEnv: Record<string, string> = { ...envVars };
  const openStreams: Array<Promise<void>> = [];

  const runController = new AbortController();
  const scriptDeadline = setTimeout(() => runController.abort(), scriptTimeoutMs);

  // `// note:` lines become api._note(...) so the note lands on the next call,
  // matching how the app annotates a run.
  const processedCode = code.replace(
    /^[ \t]*\/\/ note:(.+)$/gm,
    (_, msg: string) => `api._note(${JSON.stringify(msg.trim())});`,
  );

  let pendingNote: string | null = null;

  const resolveUrl = (url: string): string =>
    url.replace(/\{\{(\w+)\}\}/g, (_, key: string) => mutableEnv[key] ?? `{{${key}}}`);

  const makeCall = async (method: string, url: string, body: unknown, opts: CallOpts = {}) => {
    if (runController.signal.aborted) throw new Error("Script aborted");
    if (calls.length >= maxCalls) {
      throw new Error(`Call limit reached (${maxCalls}). Raise maxCalls if the script really needs more.`);
    }

    const resolved = resolveUrl(url);
    const { authHeaders, authInfo } = buildAuthHeaders(opts, mutableEnv);
    const upper = method.toUpperCase();

    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(opts.headers || {}),
    };

    const rec: ApiCall = {
      idx: calls.length,
      method: upper,
      url: resolved,
      urlExpr: url,
      status: "pending",
      statusCode: null,
      response: null,
      responseHeaders: {},
      requestBody: body,
      requestHeaders: reqHeaders,
      authInfo,
      duration: 0,
      error: null,
      timestamp: new Date().toISOString(),
      cache: false,
      note: pendingNote ?? undefined,
    };
    pendingNote = null;
    calls.push(rec);

    const started = Date.now();
    const callController = new AbortController();
    const callDeadline = setTimeout(() => callController.abort(), timeoutMs);
    const onRunAbort = () => callController.abort();
    runController.signal.addEventListener("abort", onRunAbort, { once: true });

    try {
      const init: RequestInit = {
        method: upper,
        headers: reqHeaders,
        signal: callController.signal,
      };
      if (body !== null && body !== undefined && !["GET", "HEAD", "OPTIONS"].includes(upper)) {
        init.body = typeof body === "string" ? body : JSON.stringify(body);
      }

      const res = await fetch(resolved, init);
      const text = await res.text();

      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      rec.statusCode = res.status;
      rec.status = res.ok ? "success" : "error";
      rec.response = data;
      rec.responseHeaders = Object.fromEntries([...res.headers.entries()]);
      rec.duration = Date.now() - started;

      return { data, status: res.status, headers: rec.responseHeaders, ok: res.ok };
    } catch (error) {
      rec.status = "error";
      rec.duration = Date.now() - started;

      if (runController.signal.aborted) {
        rec.error = `Script timed out after ${scriptTimeoutMs}ms`;
        throw new Error("Script aborted");
      }
      if ((error as Error).name === "AbortError") {
        rec.error = `Timeout: call exceeded ${timeoutMs}ms`;
        throw new Error(`Call to ${resolved} timed out after ${timeoutMs}ms — script stopped`);
      }
      rec.error = (error as Error).message;
      throw error;
    } finally {
      clearTimeout(callDeadline);
      runController.signal.removeEventListener("abort", onRunAbort);
    }
  };

  const makeSseCall = async (
    url: string,
    opts: CallOpts = {},
    onEvent: (event: { type: string; data: string; id?: string }) => void = () => {},
  ): Promise<{ close: () => void }> => {
    if (runController.signal.aborted) throw new Error("Script aborted");
    if (calls.length >= maxCalls) {
      throw new Error(`Call limit reached (${maxCalls}). Raise maxCalls if the script really needs more.`);
    }

    const resolved = resolveUrl(url);
    const { authHeaders, authInfo } = buildAuthHeaders(opts, mutableEnv);

    const reqHeaders: Record<string, string> = {
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
      ...authHeaders,
      ...(opts.headers || {}),
    };

    const rec: ApiCall = {
      idx: calls.length,
      method: "SSE",
      url: resolved,
      urlExpr: url,
      status: "pending",
      statusCode: null,
      response: null,
      responseHeaders: {},
      requestBody: null,
      requestHeaders: reqHeaders,
      authInfo,
      duration: 0,
      error: null,
      timestamp: new Date().toISOString(),
      cache: false,
      note: pendingNote ?? undefined,
      isSse: true,
      sseEvents: [],
    };
    pendingNote = null;
    calls.push(rec);

    const started = Date.now();
    const streamController = new AbortController();
    // A stream has no natural end, so it is always bounded: by the caller's
    // close(), by the SSE window, or by the whole-script deadline.
    const streamDeadline = setTimeout(() => streamController.abort(), sseWindowMs);
    const onRunAbort = () => streamController.abort();
    runController.signal.addEventListener("abort", onRunAbort, { once: true });

    const close = () => streamController.abort();

    try {
      const res = await fetch(resolved, { headers: reqHeaders, signal: streamController.signal });
      rec.statusCode = res.status;
      rec.responseHeaders = Object.fromEntries([...res.headers.entries()]);

      if (!res.ok || !res.body) {
        rec.status = "error";
        rec.error = !res.ok ? `HTTP ${res.status}` : "No response body";
        rec.duration = Date.now() - started;
        clearTimeout(streamDeadline);
        return { close };
      }

      rec.status = "success";

      const pump = (async () => {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        const flush = () => {
          const blocks = buf.split("\n\n");
          buf = blocks.pop() ?? "";
          for (const block of blocks) {
            if (!block.trim()) continue;
            let type = "message";
            let data = "";
            let id: string | undefined;
            for (const line of block.split("\n")) {
              if (line.startsWith("event:")) type = line.slice(6).trim();
              else if (line.startsWith("data:")) data += (data ? "\n" : "") + line.slice(5).trim();
              else if (line.startsWith("id:")) id = line.slice(3).trim();
            }
            const event: SseEvent = { type, data, id, ts: Date.now() };
            rec.sseEvents = [...(rec.sseEvents ?? []), event];
            try {
              onEvent({ type, data, id });
            } catch (error) {
              logs.push({ level: "error", msg: `SSE handler threw: ${(error as Error).message}` });
            }
          }
        };

        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            flush();
          }
          if (buf.trim()) {
            buf += "\n\n";
            flush();
          }
        } catch (error) {
          if ((error as Error).name !== "AbortError") rec.error = (error as Error).message;
        } finally {
          clearTimeout(streamDeadline);
          runController.signal.removeEventListener("abort", onRunAbort);
          rec.duration = Date.now() - started;
        }
      })();

      openStreams.push(pump);
      return { close };
    } catch (error) {
      clearTimeout(streamDeadline);
      runController.signal.removeEventListener("abort", onRunAbort);
      if ((error as Error).name === "AbortError") return { close };
      rec.status = "error";
      rec.error = (error as Error).message;
      rec.duration = Date.now() - started;
      return { close };
    }
  };

  const api = {
    get: (url: string, opts?: CallOpts) => makeCall("GET", url, null, opts),
    post: (url: string, body: unknown, opts?: CallOpts) => makeCall("POST", url, body, opts),
    put: (url: string, body: unknown, opts?: CallOpts) => makeCall("PUT", url, body, opts),
    patch: (url: string, body: unknown, opts?: CallOpts) => makeCall("PATCH", url, body, opts),
    delete: (url: string, opts?: CallOpts) => makeCall("DELETE", url, null, opts),
    options: (url: string, opts?: CallOpts) => makeCall("OPTIONS", url, null, opts),
    sse: (
      url: string,
      opts?: CallOpts,
      onEvent?: (event: { type: string; data: string; id?: string }) => void,
    ) => makeSseCall(url, opts, onEvent),
    _note: (msg: string) => {
      pendingNote = msg;
    },
    server: {} as Record<string, unknown>,
  };

  // Kept so scripts written against the browser runner run here unchanged.
  api.server = {
    get: api.get,
    post: api.post,
    put: api.put,
    patch: api.patch,
    delete: api.delete,
    options: api.options,
  };

  const fmt = (parts: unknown[]) =>
    parts
      .map((part) => (typeof part === "object" ? JSON.stringify(part, null, 2) : String(part)))
      .join(" ");

  const capturedConsole = {
    log: (...a: unknown[]) => logs.push({ level: "log", msg: fmt(a) }),
    error: (...a: unknown[]) => logs.push({ level: "error", msg: fmt(a) }),
    warn: (...a: unknown[]) => logs.push({ level: "warn", msg: fmt(a) }),
    info: (...a: unknown[]) => logs.push({ level: "info", msg: fmt(a) }),
    debug: (...a: unknown[]) => logs.push({ level: "log", msg: fmt(a) }),
  };

  const sandbox = {
    api,
    env: mutableEnv,
    console: capturedConsole,
    // Timers and web primitives a script realistically reaches for. `process`,
    // `require`, and the filesystem are deliberately absent.
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    queueMicrotask,
    TextEncoder,
    TextDecoder,
    URL,
    URLSearchParams,
    AbortController,
    Buffer,
    atob,
    btoa,
    crypto: globalThis.crypto,
    structuredClone,
  };

  let error: string | null = null;

  try {
    const context = createContext(sandbox);
    const wrapped = `(async () => {\n${processedCode}\n})()`;
    await runInContext(wrapped, context, { filename: "bulky-script.js" });
  } catch (thrown) {
    const msg = (thrown as Error).message;
    if (msg !== "Script aborted") {
      error = msg;
      logs.push({ level: "error", msg: `Script error: ${msg}` });
    } else {
      error = `Script aborted after ${scriptTimeoutMs}ms`;
    }
  } finally {
    // Streams the script left open finish (or hit their window) before the
    // result is read, so collected events are not lost.
    await Promise.allSettled(openStreams);
    clearTimeout(scriptDeadline);
  }

  const extractedVars: Record<string, string> = {};
  for (const [key, value] of Object.entries(mutableEnv)) {
    if (String(value) !== String(envVars[key] ?? "")) extractedVars[key] = String(value);
  }

  return { calls, logs, extractedVars, aborted: runController.signal.aborted, error };
}
