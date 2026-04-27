import type { ApiCall, LogEntry, AuthInfo, SseEvent } from './types';

type OnUpdate = (calls: ApiCall[], logs: LogEntry[]) => void;

type CachedEntry = {
  statusCode: number | null;
  response: unknown;
  responseHeaders: Record<string, string>;
  duration: number;
  timestamp: string | null;
};

export async function runScript(
  code: string,
  envVars: Record<string, string>,
  onUpdate: OnUpdate,
  waitForNext?: () => Promise<void>,
  responseCache?: Record<string, CachedEntry>,
): Promise<{ calls: ApiCall[]; logs: LogEntry[] }> {
  const calls: ApiCall[] = [];
  const logs: LogEntry[] = [];

  // Preprocess // note: comments → api._note(...) calls
  const processedCode = code.replace(
    /^[ \t]*\/\/ note:(.+)$/gm,
    (_, msg) => `api._note(${JSON.stringify(msg.trim())});`
  );

  let pendingNote: string | null = null;

  const makeCall = async (
    method: string,
    url: string,
    body: unknown,
    opts: {
      auth?: { type: string; token?: string; username?: string; password?: string; header?: string; key?: string };
      headers?: Record<string, string>;
    } = {},
    isServer = false
  ) => {
    const resolved = url.replace(/\{\{(\w+)\}\}/g, (_, k) => envVars[k] ?? `{{${k}}}`);
    let authHeaders: Record<string, string> = {};
    let authInfo: AuthInfo = null;

    if (opts.auth) {
      const a = opts.auth;
      if (a.type === 'bearer' && a.token) {
        authHeaders['Authorization'] = `Bearer ${a.token}`;
        authInfo = { type: 'Bearer Token', token: a.token };
      } else if (a.type === 'basic' && a.username && a.password) {
        authHeaders['Authorization'] = `Basic ${btoa(`${a.username}:${a.password}`)}`;
        authInfo = { type: 'Basic Auth', username: a.username };
      } else if (a.type === 'apikey' && a.key) {
        const header = a.header || 'X-API-Key';
        authHeaders[header] = a.key;
        authInfo = { type: 'API Key', header, key: a.key };
      }
    } else if (envVars.token) {
      authHeaders['Authorization'] = `Bearer ${envVars.token}`;
      authInfo = { type: 'Bearer (env)', token: envVars.token };
    }

    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(opts.headers || {}),
    };

    const rec: ApiCall = {
      idx: calls.length,
      method: method.toUpperCase(),
      url: resolved,
      urlExpr: url,
      status: 'pending',
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
    // Dispatch copies — Immer freezes dispatched objects, local rec must stay mutable
    onUpdate(calls.map((c) => ({ ...c })), [...logs]);

    // Step mode: show call as pending, wait for user to click Next before fetching
    if (waitForNext) await waitForNext();

    // Cache lookup
    const cacheKey = `${method.toUpperCase()}::${resolved}`;
    if (responseCache && cacheKey in responseCache) {
      const cached = responseCache[cacheKey];
      rec.statusCode = cached.statusCode;
      rec.status = cached.statusCode !== null && cached.statusCode >= 200 && cached.statusCode < 300 ? 'success' : 'error';
      rec.response = cached.response;
      rec.responseHeaders = cached.responseHeaders;
      rec.duration = cached.duration;
      rec.timestamp = cached.timestamp;
      onUpdate(calls.map((c) => ({ ...c })), [...logs]);
      return { data: cached.response, status: cached.statusCode ?? 0, headers: cached.responseHeaders, ok: rec.status === 'success' };
    }

    const t0 = Date.now();
    try {
      const fo: RequestInit = { method: method.toUpperCase(), headers: reqHeaders };
      if (body && !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
        fo.body = JSON.stringify(body);
      }

      let res: Response;
      let text: string;
      let headers: Record<string, string> = {};
      let isOk: boolean;

      if (isServer) {
        res = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: method.toUpperCase(),
            url: resolved,
            headers: reqHeaders,
            body: body && !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase()) ? body : undefined,
          }),
        });

        if (!res.ok) {
          throw new Error(`Proxy error: ${res.statusText}`);
        }

        const proxyData = await res.json();
        if (proxyData.error) {
          throw new Error(proxyData.error);
        }

        text = proxyData.data;
        headers = proxyData.headers || {};
        isOk = proxyData.status >= 200 && proxyData.status < 300;
        
        // Mock the response object properties that are used
        Object.defineProperty(res, 'status', { value: proxyData.status });
        Object.defineProperty(res, 'ok', { value: isOk });
      } else {
        res = await fetch(resolved, fo);
        text = await res.text();
        headers = Object.fromEntries([...res.headers.entries()]);
        isOk = res.ok;
      }

      let data: unknown;
      try { data = JSON.parse(text); } catch { data = text; }

      rec.statusCode = res.status;
      rec.status = isOk ? 'success' : 'error';
      rec.response = data;
      rec.responseHeaders = headers;
      rec.duration = Date.now() - t0;
      onUpdate(calls.map((c) => ({ ...c })), [...logs]);
      return { data, status: res.status, headers: rec.responseHeaders, ok: isOk };
    } catch (e) {
      rec.status = 'error';
      rec.error = (e as Error).message;
      rec.duration = Date.now() - t0;
      onUpdate(calls.map((c) => ({ ...c })), [...logs]);
      throw e;
    }
  };

  const makeSseCall = async (
    url: string,
    opts: {
      auth?: { type: string; token?: string; username?: string; password?: string; header?: string; key?: string };
      headers?: Record<string, string>;
    } = {},
    onEvent: (event: { type: string; data: string; id?: string }) => void = () => {}
  ): Promise<{ close: () => void }> => {
    const resolved = url.replace(/\{\{(\w+)\}\}/g, (_, k) => envVars[k] ?? `{{${k}}}`);
    let authHeaders: Record<string, string> = {};
    let authInfo: AuthInfo = null;

    if (opts.auth) {
      const a = opts.auth;
      if (a.type === 'bearer' && a.token) {
        authHeaders['Authorization'] = `Bearer ${a.token}`;
        authInfo = { type: 'Bearer Token', token: a.token };
      } else if (a.type === 'basic' && a.username && a.password) {
        authHeaders['Authorization'] = `Basic ${btoa(`${a.username}:${a.password}`)}`;
        authInfo = { type: 'Basic Auth', username: a.username };
      } else if (a.type === 'apikey' && a.key) {
        const header = a.header || 'X-API-Key';
        authHeaders[header] = a.key;
        authInfo = { type: 'API Key', header, key: a.key };
      }
    } else if (envVars.token) {
      authHeaders['Authorization'] = `Bearer ${envVars.token}`;
      authInfo = { type: 'Bearer (env)', token: envVars.token };
    }

    const reqHeaders: Record<string, string> = {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
      ...authHeaders,
      ...(opts.headers || {}),
    };

    const rec: ApiCall = {
      idx: calls.length,
      method: 'SSE',
      url: resolved,
      urlExpr: url,
      status: 'pending',
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
    onUpdate(calls.map((c) => ({ ...c })), [...logs]);

    if (waitForNext) await waitForNext();

    const t0 = Date.now();
    const controller = new AbortController();

    try {
      const res = await fetch(resolved, { headers: reqHeaders, signal: controller.signal });
      rec.statusCode = res.status;
      rec.responseHeaders = Object.fromEntries([...res.headers.entries()]);

      if (!res.ok || !res.body) {
        rec.status = 'error';
        rec.error = !res.ok ? `HTTP ${res.status}` : 'No response body';
        rec.duration = Date.now() - t0;
        onUpdate(calls.map((c) => ({ ...c })), [...logs]);
        return { close: () => {} };
      }

      rec.status = 'success';
      onUpdate(calls.map((c) => ({ ...c })), [...logs]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      const flushBuf = () => {
        const blocks = buf.split('\n\n');
        buf = blocks.pop() ?? '';
        for (const block of blocks) {
          if (!block.trim()) continue;
          let type = 'message';
          let data = '';
          let id: string | undefined;
          for (const line of block.split('\n')) {
            if (line.startsWith('event:')) type = line.slice(6).trim();
            else if (line.startsWith('data:')) data += (data ? '\n' : '') + line.slice(5).trim();
            else if (line.startsWith('id:')) id = line.slice(3).trim();
          }
          const ev: SseEvent = { type, data, id, ts: Date.now() };
          rec.sseEvents = [...(rec.sseEvents ?? []), ev];
          onUpdate(calls.map((c) => ({ ...c })), [...logs]);
          onEvent({ type, data, id });
        }
      };

      (async () => {
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            flushBuf();
          }
          if (buf.trim()) { buf += '\n\n'; flushBuf(); }
        } catch (e) {
          if ((e as Error).name !== 'AbortError') {
            rec.error = (e as Error).message;
          }
        } finally {
          rec.duration = Date.now() - t0;
          onUpdate(calls.map((c) => ({ ...c })), [...logs]);
        }
      })();

      return { close: () => { controller.abort(); } };
    } catch (e) {
      if ((e as Error).name === 'AbortError') return { close: () => {} };
      rec.status = 'error';
      rec.error = (e as Error).message;
      rec.duration = Date.now() - t0;
      onUpdate(calls.map((c) => ({ ...c })), [...logs]);
      return { close: () => {} };
    }
  };

  const api = {
    get:     (url: string, opts?: object)               => makeCall('GET',     url, null, opts as never, false),
    post:    (url: string, body: unknown, opts?: object) => makeCall('POST',    url, body, opts as never, false),
    put:     (url: string, body: unknown, opts?: object) => makeCall('PUT',     url, body, opts as never, false),
    patch:   (url: string, body: unknown, opts?: object) => makeCall('PATCH',   url, body, opts as never, false),
    delete:  (url: string, opts?: object)               => makeCall('DELETE',   url, null, opts as never, false),
    options: (url: string, opts?: object)               => makeCall('OPTIONS',  url, null, opts as never, false),
    sse: (url: string, opts?: object, onEvent?: (event: { type: string; data: string; id?: string }) => void) =>
      makeSseCall(url, opts as never, onEvent),
    _note: (msg: string) => { pendingNote = msg; },
    server: {
      get:     (url: string, opts?: object)               => makeCall('GET',     url, null, opts as never, true),
      post:    (url: string, body: unknown, opts?: object) => makeCall('POST',    url, body, opts as never, true),
      put:     (url: string, body: unknown, opts?: object) => makeCall('PUT',     url, body, opts as never, true),
      patch:   (url: string, body: unknown, opts?: object) => makeCall('PATCH',   url, body, opts as never, true),
      delete:  (url: string, opts?: object)               => makeCall('DELETE',   url, null, opts as never, true),
      options: (url: string, opts?: object)               => makeCall('OPTIONS',  url, null, opts as never, true),
    }
  };

  const fmt = (a: unknown[]) =>
    a.map((x) => (typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x))).join(' ');

  const con = {
    log:   (...a: unknown[]) => { logs.push({ level: 'log',   msg: fmt(a) }); onUpdate(calls.map((c) => ({ ...c })), [...logs]); },
    error: (...a: unknown[]) => { logs.push({ level: 'error', msg: fmt(a) }); onUpdate(calls.map((c) => ({ ...c })), [...logs]); },
    warn:  (...a: unknown[]) => { logs.push({ level: 'warn',  msg: fmt(a) }); onUpdate(calls.map((c) => ({ ...c })), [...logs]); },
    info:  (...a: unknown[]) => { logs.push({ level: 'info',  msg: fmt(a) }); onUpdate(calls.map((c) => ({ ...c })), [...logs]); },
  };

  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const AF = Object.getPrototypeOf(async function () {}).constructor as new (...args: string[]) => (...fArgs: unknown[]) => Promise<void>;
    await (new AF('api', 'env', 'console', processedCode))(api, envVars, con);
  } catch (e) {
    logs.push({ level: 'error', msg: `Script error: ${(e as Error).message}` });
    onUpdate(calls.map((c) => ({ ...c })), [...logs]);
  }

  return { calls, logs };
}
