import type { ApiCall, LogEntry, AuthInfo, SseEvent, Assertion } from "./types";
import { toRunnableJs } from "./transpile";
import { makeExpect } from "./assertions";
import { isRawBody, summarizeBody } from "./requestBody";

type OnUpdate = (calls: ApiCall[], logs: LogEntry[]) => void;

type CachedEntry = {
  statusCode: number | null;
  response: unknown;
  responseHeaders: Record<string, string>;
  duration: number;
  timestamp: string | null;
};

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
  /** Stream calls only (`api.sse`/`api.stream`/`api.server.*`) — the verb
   *  used to open the stream. Defaults to GET for `sse`, POST for `stream`. */
  method?: string;
  /** Stream calls only — JSON body sent with the request that opens the
   *  stream (an LLM chat/completions payload, typically). */
  body?: unknown;
};

type StreamResult = {
  /** Aborts the stream early — same effect as the run itself being stopped. */
  close: () => void;
  /** Resolves once the stream ends (or fails), with everything received. */
  done: Promise<{ events: SseEvent[]; text: string; status: number | null }>;
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
      authHeaders["Authorization"] =
        `Basic ${btoa(`${a.username}:${a.password}`)}`;
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

export async function runScript(
  code: string,
  envVars: Record<string, string>,
  onUpdate: OnUpdate,
  waitForNext?: () => Promise<void>,
  responseCache?: Record<string, CachedEntry>,
  callTimeout?: number,
  abortSignal?: AbortSignal,
): Promise<{
  calls: ApiCall[];
  logs: LogEntry[];
  extractedVars: Record<string, string>;
  assertions: Assertion[];
}> {
  const calls: ApiCall[] = [];
  const logs: LogEntry[] = [];
  const mutableEnv: Record<string, string> = { ...envVars };

  // Expectations resolved before the first call land here, then move onto that
  // call once it exists; ones from a run that makes no calls stay here and are
  // still returned for the run summary.
  const pendingAssertions: Assertion[] = [];
  const allAssertions: Assertion[] = [];

  const recordAssertion = (a: Assertion) => {
    const target = calls[calls.length - 1];
    if (target) (target.assertions ??= []).push(a);
    else pendingAssertions.push(a);
    allAssertions.push(a);
    logs.push({
      level: a.ok ? "info" : "error",
      msg: `${a.ok ? "✓" : "✗"} ${a.message}${a.detail ? ` — ${a.detail}` : ""}`,
    });
    onUpdate(
      calls.map((c) => ({ ...c })),
      [...logs],
    );
  };

  const expect = makeExpect(recordAssertion);

  const claimPending = (rec: ApiCall) => {
    if (pendingAssertions.length) {
      rec.assertions = [...(rec.assertions ?? []), ...pendingAssertions];
      pendingAssertions.length = 0;
    }
  };

  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve, reject) => {
      if (abortSignal?.aborted) return reject(new Error("Script aborted"));
      const id = setTimeout(resolve, Math.max(0, Number(ms) || 0));
      abortSignal?.addEventListener(
        "abort",
        () => {
          clearTimeout(id);
          reject(new Error("Script aborted"));
        },
        { once: true },
      );
    });

  // `env` is a proxy so `env.x = v` and `env.set('x', v)` both write into
  // `mutableEnv`; `set` / `get` are surfaced without landing in the diff.
  const envProxy = new Proxy(mutableEnv, {
    get(target, prop) {
      if (typeof prop !== "string") return target[prop as unknown as string];
      if (prop === "set") {
        return (k: string, v: unknown) => {
          target[k] = v == null ? "" : String(v);
        };
      }
      if (prop === "get") return (k: string) => target[k];
      return target[prop];
    },
    set(target, prop, value) {
      if (typeof prop === "string") {
        target[prop] = value == null ? "" : String(value);
      }
      return true;
    },
  });

  // Preprocess // note: comments → api._note(...) calls, then strip types:
  // the buffer is TypeScript, the runtime executes JavaScript.
  const notedCode = code.replace(
    /^[ \t]*\/\/ note:(.+)$/gm,
    (_, msg) => `api._note(${JSON.stringify(msg.trim())});`,
  );

  let processedCode: string;
  try {
    processedCode = await toRunnableJs(notedCode);
  } catch (e) {
    logs.push({ level: "error", msg: `Script error: ${(e as Error).message}` });
    onUpdate([], [...logs]);
    return { calls, logs, extractedVars: {}, assertions: [] };
  }

  let pendingNote: string | null = null;

  const makeCall = async (
    method: string,
    url: string,
    body: unknown,
    opts: CallOpts = {},
    isServer = false,
  ) => {
    if (abortSignal?.aborted) throw new Error("Script aborted");

    const resolved = url.replace(
      /\{\{(\w+)\}\}/g,
      (_, k) => mutableEnv[k] ?? `{{${k}}}`,
    );
    const { authHeaders, authInfo } = buildAuthHeaders(opts, mutableEnv);

    // A FormData/File/Blob body — from `api.form()` or `api.file()` — is sent
    // to `fetch` as-is; JSON-encoding it would turn the file into "[object
    // File]". Only its (serializable) shape is kept on the call record.
    const rawBody = isRawBody(body);
    const methodSendsBody = !["GET", "HEAD", "OPTIONS"].includes(
      method.toUpperCase(),
    );
    const hasBody = Boolean(body) && methodSendsBody;

    const reqHeaders: Record<string, string> = {
      // Force JSON only when we're the one encoding the body — a raw body
      // sets its own Content-Type (the multipart boundary, for FormData).
      ...(rawBody ? {} : { "Content-Type": "application/json" }),
      ...authHeaders,
      ...(opts.headers || {}),
    };

    const rec: ApiCall = {
      idx: calls.length,
      method: method.toUpperCase(),
      url: resolved,
      urlExpr: url,
      status: "pending",
      statusCode: null,
      response: null,
      responseHeaders: {},
      requestBody: rawBody ? summarizeBody(body) : body,
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
    claimPending(rec);
    onUpdate(
      calls.map((c) => ({ ...c })),
      [...logs],
    );

    if (waitForNext) await waitForNext();
    if (abortSignal?.aborted) throw new Error("Script aborted");

    // Cache lookup
    const cacheKey = `${method.toUpperCase()}::${resolved}`;
    if (responseCache && cacheKey in responseCache) {
      const cached = responseCache[cacheKey];
      rec.statusCode = cached.statusCode;
      rec.status =
        cached.statusCode !== null &&
        cached.statusCode >= 200 &&
        cached.statusCode < 300
          ? "success"
          : "error";
      rec.response = cached.response;
      rec.responseHeaders = cached.responseHeaders;
      rec.duration = cached.duration;
      rec.timestamp = cached.timestamp;
      onUpdate(
        calls.map((c) => ({ ...c })),
        [...logs],
      );
      return {
        data: cached.response,
        status: cached.statusCode ?? 0,
        headers: cached.responseHeaders,
        ok: rec.status === "success",
      };
    }

    const t0 = Date.now();
    const controller = new AbortController();

    // Link to both callTimeout and external abortSignal
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let timedOut = false;
    if (callTimeout && callTimeout > 0) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, callTimeout);
    }
    abortSignal?.addEventListener("abort", () => controller.abort(), {
      once: true,
    });

    try {
      const fo: RequestInit = {
        method: method.toUpperCase(),
        headers: reqHeaders,
        signal: controller.signal,
      };
      if (hasBody) {
        fo.body = rawBody ? (body as FormData | Blob) : JSON.stringify(body);
      }

      let res: Response;
      let text: string;
      let headers: Record<string, string> = {};
      let isOk: boolean;

      if (isServer && rawBody) {
        // Stream the FormData/Blob straight through — re-encoding a file as
        // JSON would lose its bytes. The target lands in custom headers
        // because the outer Content-Type has to stay whatever the body itself
        // declares (the multipart boundary, for FormData).
        res = await fetch("/api/proxy", {
          method: "POST",
          headers: {
            "X-Proxy-Url": resolved,
            "X-Proxy-Method": method.toUpperCase(),
            "X-Proxy-Headers": encodeURIComponent(JSON.stringify(reqHeaders)),
          },
          body: body as FormData | Blob,
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`Proxy error: ${res.statusText}`);

        const proxyData = await res.json();
        if (proxyData.error) throw new Error(proxyData.error);

        text = proxyData.data;
        headers = proxyData.headers || {};
        isOk = proxyData.status >= 200 && proxyData.status < 300;

        Object.defineProperty(res, "status", { value: proxyData.status });
        Object.defineProperty(res, "ok", { value: isOk });
      } else if (isServer) {
        res = await fetch("/api/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: method.toUpperCase(),
            url: resolved,
            headers: reqHeaders,
            body: hasBody ? body : undefined,
          }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`Proxy error: ${res.statusText}`);

        const proxyData = await res.json();
        if (proxyData.error) throw new Error(proxyData.error);

        text = proxyData.data;
        headers = proxyData.headers || {};
        isOk = proxyData.status >= 200 && proxyData.status < 300;

        Object.defineProperty(res, "status", { value: proxyData.status });
        Object.defineProperty(res, "ok", { value: isOk });
      } else {
        res = await fetch(resolved, fo);
        text = await res.text();
        headers = Object.fromEntries([...res.headers.entries()]);
        isOk = res.ok;
      }

      if (timeoutId) clearTimeout(timeoutId);

      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      rec.statusCode = res.status;
      rec.status = isOk ? "success" : "error";
      rec.response = data;
      rec.responseHeaders = headers;
      rec.duration = Date.now() - t0;
      onUpdate(
        calls.map((c) => ({ ...c })),
        [...logs],
      );
      return {
        data,
        status: res.status,
        headers: rec.responseHeaders,
        ok: isOk,
      };
    } catch (e) {
      if (timeoutId) clearTimeout(timeoutId);
      rec.status = "error";
      rec.duration = Date.now() - t0;
      if (abortSignal?.aborted && !timedOut) {
        rec.error = "Aborted by user";
        onUpdate(
          calls.map((c) => ({ ...c })),
          [...logs],
        );
        throw new Error("Script aborted");
      }
      if (timedOut || (e as Error).name === "AbortError") {
        rec.error = `Timeout: call exceeded ${callTimeout}ms`;
        onUpdate(
          calls.map((c) => ({ ...c })),
          [...logs],
        );
        throw new Error(
          `Call to ${resolved} timed out after ${callTimeout}ms — script stopped`,
        );
      }
      rec.error = (e as Error).message;
      onUpdate(
        calls.map((c) => ({ ...c })),
        [...logs],
      );
      throw e;
    }
  };

  // Shared by `api.sse` / `api.stream` / their `api.server.*` counterparts.
  // `method` + `body` let a stream open with a POST and a JSON payload (an
  // LLM chat/completions call, typically) rather than only a bare GET; each
  // parsed SSE frame lands on `rec.sseEvents` and fires `onUpdate` as it
  // arrives, so the response panel renders tokens live instead of waiting for
  // the connection to close. `isServer` routes through `/api/proxy` with the
  // `X-Proxy-Stream` header so `proxyPassthrough` pipes the upstream body
  // straight through instead of buffering it — use it wherever CORS would
  // otherwise block calling the host directly.
  const makeStreamCall = async (
    method: string,
    url: string,
    body: unknown,
    opts: CallOpts = {},
    isServer = false,
    onEvent: (event: {
      type: string;
      data: string;
      id?: string;
    }) => void = () => {},
  ): Promise<StreamResult> => {
    if (abortSignal?.aborted) throw new Error("Script aborted");

    const resolved = url.replace(
      /\{\{(\w+)\}\}/g,
      (_, k) => mutableEnv[k] ?? `{{${k}}}`,
    );
    const { authHeaders, authInfo } = buildAuthHeaders(opts, mutableEnv);

    const M = method.toUpperCase();
    const sendsBody = body != null && !["GET", "HEAD", "OPTIONS"].includes(M);

    const reqHeaders: Record<string, string> = {
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
      ...(sendsBody ? { "Content-Type": "application/json" } : {}),
      ...authHeaders,
      ...(opts.headers || {}),
    };

    const rec: ApiCall = {
      idx: calls.length,
      // GET stays labelled "SSE" (matches the original api.sse() display);
      // any other verb shows as itself so a streamed POST reads as POST.
      method: M === "GET" ? "SSE" : M,
      url: resolved,
      urlExpr: url,
      status: "pending",
      statusCode: null,
      response: null,
      responseHeaders: {},
      requestBody: sendsBody ? body : null,
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
    claimPending(rec);
    onUpdate(
      calls.map((c) => ({ ...c })),
      [...logs],
    );

    if (waitForNext) await waitForNext();
    if (abortSignal?.aborted) throw new Error("Script aborted");

    const t0 = Date.now();
    const controller = new AbortController();
    abortSignal?.addEventListener("abort", () => controller.abort(), {
      once: true,
    });

    let resolveDone!: (v: {
      events: SseEvent[];
      text: string;
      status: number | null;
    }) => void;
    const done = new Promise<{
      events: SseEvent[];
      text: string;
      status: number | null;
    }>((resolve) => {
      resolveDone = resolve;
    });
    const settle = () =>
      resolveDone({
        events: rec.sseEvents ?? [],
        text: (rec.sseEvents ?? []).map((e) => e.data).join(""),
        status: rec.statusCode,
      });

    try {
      let res: Response;
      if (isServer) {
        res = await fetch("/api/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Proxy-Stream": "1" },
          body: JSON.stringify({
            method: M,
            url: resolved,
            headers: reqHeaders,
            body: sendsBody ? body : undefined,
          }),
          signal: controller.signal,
        });
        // Real upstream status rides in this header — the outer fetch's own
        // `status` is the proxy's own (already == upstream's, but pinning it
        // explicitly keeps `rec.statusCode` correct if that ever changes).
        const proxyStatus = res.headers.get("x-proxy-status");
        if (proxyStatus) {
          Object.defineProperty(res, "status", {
            value: Number(proxyStatus),
            configurable: true,
          });
        }
      } else {
        res = await fetch(resolved, {
          method: M,
          headers: reqHeaders,
          body: sendsBody ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
      }

      rec.statusCode = res.status;
      rec.responseHeaders = Object.fromEntries([...res.headers.entries()]);

      if (!res.ok || !res.body) {
        rec.status = "error";
        rec.error = !res.ok ? `HTTP ${res.status}` : "No response body";
        rec.duration = Date.now() - t0;
        onUpdate(
          calls.map((c) => ({ ...c })),
          [...logs],
        );
        settle();
        return { close: () => {}, done };
      }

      rec.status = "success";
      onUpdate(
        calls.map((c) => ({ ...c })),
        [...logs],
      );

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      const flushBuf = () => {
        const blocks = buf.split("\n\n");
        buf = blocks.pop() ?? "";
        for (const block of blocks) {
          if (!block.trim()) continue;
          let type = "message";
          let data = "";
          let id: string | undefined;
          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) type = line.slice(6).trim();
            else if (line.startsWith("data:"))
              data += (data ? "\n" : "") + line.slice(5).trim();
            else if (line.startsWith("id:")) id = line.slice(3).trim();
          }
          const ev: SseEvent = { type, data, id, ts: Date.now() };
          rec.sseEvents = [...(rec.sseEvents ?? []), ev];
          onUpdate(
            calls.map((c) => ({ ...c })),
            [...logs],
          );
          onEvent({ type, data, id });
        }
      };

      (async () => {
        try {
          for (;;) {
            const { done: rdDone, value } = await reader.read();
            if (rdDone) break;
            buf += decoder.decode(value, { stream: true });
            flushBuf();
          }
          if (buf.trim()) {
            buf += "\n\n";
            flushBuf();
          }
        } catch (e) {
          if ((e as Error).name !== "AbortError") {
            rec.error = (e as Error).message;
          }
        } finally {
          rec.duration = Date.now() - t0;
          onUpdate(
            calls.map((c) => ({ ...c })),
            [...logs],
          );
          settle();
        }
      })();

      return {
        close: () => {
          controller.abort();
        },
        done,
      };
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        settle();
        return { close: () => {}, done };
      }
      rec.status = "error";
      rec.error = (e as Error).message;
      rec.duration = Date.now() - t0;
      onUpdate(
        calls.map((c) => ({ ...c })),
        [...logs],
      );
      settle();
      return { close: () => {}, done };
    }
  };

  const makeSseCall = (
    url: string,
    opts: CallOpts = {},
    onEvent?: (event: { type: string; data: string; id?: string }) => void,
    isServer = false,
  ): Promise<StreamResult> =>
    makeStreamCall(
      opts.method ?? "GET",
      url,
      opts.body ?? null,
      opts,
      isServer,
      onEvent,
    );

  const makeStreamShorthand = (
    url: string,
    body: unknown,
    opts: CallOpts = {},
    onEvent?: (event: { type: string; data: string; id?: string }) => void,
    isServer = false,
  ): Promise<StreamResult> =>
    makeStreamCall(
      opts.method ?? (body != null ? "POST" : "GET"),
      url,
      body ?? opts.body ?? null,
      opts,
      isServer,
      onEvent,
    );

  const api = {
    get: (url: string, opts?: CallOpts) =>
      makeCall("GET", url, null, opts, false),
    post: (url: string, body: unknown, opts?: CallOpts) =>
      makeCall("POST", url, body, opts, false),
    put: (url: string, body: unknown, opts?: CallOpts) =>
      makeCall("PUT", url, body, opts, false),
    patch: (url: string, body: unknown, opts?: CallOpts) =>
      makeCall("PATCH", url, body, opts, false),
    delete: (url: string, opts?: CallOpts) =>
      makeCall("DELETE", url, null, opts, false),
    options: (url: string, opts?: CallOpts) =>
      makeCall("OPTIONS", url, null, opts, false),
    head: (url: string, opts?: CallOpts) =>
      makeCall("HEAD", url, null, opts, false),
    sse: (
      url: string,
      opts?: CallOpts,
      onEvent?: (event: { type: string; data: string; id?: string }) => void,
    ) => makeSseCall(url, opts, onEvent),
    // POST (by default) a JSON body and stream the `text/event-stream` reply
    // live — an LLM chat/completions call, typically. Same live rendering as
    // `sse`, plus a body. Direct fetch: use `api.server.stream` instead when
    // the target blocks browser CORS (most hosted LLM APIs do).
    stream: (
      url: string,
      body?: unknown,
      opts?: CallOpts,
      onEvent?: (event: { type: string; data: string; id?: string }) => void,
    ) => makeStreamShorthand(url, body, opts, onEvent),
    _note: (msg: string) => {
      pendingNote = msg;
    },
    assert: (condition: unknown, message?: string) => {
      recordAssertion({
        ok: Boolean(condition),
        message: message || "assertion",
        detail: condition ? undefined : "value was falsy",
      });
    },
    file: (accept?: string): Promise<File> => {
      if (abortSignal?.aborted) return Promise.reject(new Error("Script aborted"));
      return new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        if (accept) input.accept = accept;
        input.onchange = () => {
          const picked = input.files?.[0];
          if (picked) resolve(picked);
          else reject(new Error("No file selected"));
        };
        // Chromium fires `cancel` when the picker is dismissed with no file;
        // other engines just never resolve, same as any picker the user backs
        // out of.
        input.oncancel = () => reject(new Error("No file selected"));
        input.click();
      });
    },
    form: (fields: Record<string, unknown>): FormData => {
      const data = new FormData();
      for (const [key, value] of Object.entries(fields)) {
        data.append(key, value instanceof Blob ? value : String(value));
      }
      return data;
    },
    server: {
      get: (url: string, opts?: CallOpts) =>
        makeCall("GET", url, null, opts, true),
      post: (url: string, body: unknown, opts?: CallOpts) =>
        makeCall("POST", url, body, opts, true),
      put: (url: string, body: unknown, opts?: CallOpts) =>
        makeCall("PUT", url, body, opts, true),
      patch: (url: string, body: unknown, opts?: CallOpts) =>
        makeCall("PATCH", url, body, opts, true),
      delete: (url: string, opts?: CallOpts) =>
        makeCall("DELETE", url, null, opts, true),
      options: (url: string, opts?: CallOpts) =>
        makeCall("OPTIONS", url, null, opts, true),
      head: (url: string, opts?: CallOpts) =>
        makeCall("HEAD", url, null, opts, true),
      sse: (
        url: string,
        opts?: CallOpts,
        onEvent?: (event: { type: string; data: string; id?: string }) => void,
      ) => makeSseCall(url, opts, onEvent, true),
      // The proxied counterpart of `api.stream` — routes through
      // `/api/proxy` (`proxyPassthrough`) so a CORS-blocked LLM host still
      // streams live instead of failing or requiring a buffered response.
      stream: (
        url: string,
        body?: unknown,
        opts?: CallOpts,
        onEvent?: (event: { type: string; data: string; id?: string }) => void,
      ) => makeStreamShorthand(url, body, opts, onEvent, true),
    },
  };

  const fmt = (a: unknown[]) =>
    a
      .map((x) =>
        typeof x === "object" ? JSON.stringify(x, null, 2) : String(x),
      )
      .join(" ");

  const con = {
    log: (...a: unknown[]) => {
      logs.push({ level: "log", msg: fmt(a) });
      onUpdate(
        calls.map((c) => ({ ...c })),
        [...logs],
      );
    },
    error: (...a: unknown[]) => {
      logs.push({ level: "error", msg: fmt(a) });
      onUpdate(
        calls.map((c) => ({ ...c })),
        [...logs],
      );
    },
    warn: (...a: unknown[]) => {
      logs.push({ level: "warn", msg: fmt(a) });
      onUpdate(
        calls.map((c) => ({ ...c })),
        [...logs],
      );
    },
    info: (...a: unknown[]) => {
      logs.push({ level: "info", msg: fmt(a) });
      onUpdate(
        calls.map((c) => ({ ...c })),
        [...logs],
      );
    },
  };

  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const AF = Object.getPrototypeOf(async function () {}).constructor as new (
      ...args: string[]
    ) => (...fArgs: unknown[]) => Promise<void>;
    await new AF(
      "api",
      "env",
      "console",
      "sleep",
      "expect",
      processedCode,
    )(api, envProxy, con, sleep, expect);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg !== "Script aborted") {
      logs.push({ level: "error", msg: `Script error: ${msg}` });
      onUpdate(
        calls.map((c) => ({ ...c })),
        [...logs],
      );
    }
  }

  const extractedVars: Record<string, string> = {};
  for (const [k, v] of Object.entries(mutableEnv)) {
    if (String(v) !== String(envVars[k] ?? "")) {
      extractedVars[k] = String(v);
    }
  }

  return { calls, logs, extractedVars, assertions: allAssertions };
}
