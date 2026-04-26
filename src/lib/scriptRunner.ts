import type { ApiCall, LogEntry, AuthInfo } from './types';

type OnUpdate = (calls: ApiCall[], logs: LogEntry[]) => void;

export async function runScript(
  code: string,
  envVars: Record<string, string>,
  onUpdate: OnUpdate,
  waitForNext?: () => Promise<void>,
): Promise<{ calls: ApiCall[]; logs: LogEntry[] }> {
  const calls: ApiCall[] = [];
  const logs: LogEntry[] = [];

  const makeCall = async (
    method: string,
    url: string,
    body: unknown,
    opts: {
      auth?: { type: string; token?: string; username?: string; password?: string; header?: string; key?: string };
      headers?: Record<string, string>;
    } = {}
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
    };

    calls.push(rec);
    // Dispatch copies — Immer freezes dispatched objects, local rec must stay mutable
    onUpdate(calls.map((c) => ({ ...c })), [...logs]);

    // Step mode: show call as pending, wait for user to click Next before fetching
    if (waitForNext) await waitForNext();

    const t0 = Date.now();
    try {
      const fo: RequestInit = { method: method.toUpperCase(), headers: reqHeaders };
      if (body && !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
        fo.body = JSON.stringify(body);
      }
      const res = await fetch(resolved, fo);
      const text = await res.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch { data = text; }

      rec.statusCode = res.status;
      rec.status = res.ok ? 'success' : 'error';
      rec.response = data;
      rec.responseHeaders = Object.fromEntries([...res.headers.entries()]);
      rec.duration = Date.now() - t0;
      onUpdate(calls.map((c) => ({ ...c })), [...logs]);
      return { data, status: res.status, headers: rec.responseHeaders, ok: res.ok };
    } catch (e) {
      rec.status = 'error';
      rec.error = (e as Error).message;
      rec.duration = Date.now() - t0;
      onUpdate(calls.map((c) => ({ ...c })), [...logs]);
      throw e;
    }
  };

  const api = {
    get:     (url: string, opts?: object)               => makeCall('GET',     url, null, opts as never),
    post:    (url: string, body: unknown, opts?: object) => makeCall('POST',    url, body, opts as never),
    put:     (url: string, body: unknown, opts?: object) => makeCall('PUT',     url, body, opts as never),
    patch:   (url: string, body: unknown, opts?: object) => makeCall('PATCH',   url, body, opts as never),
    delete:  (url: string, opts?: object)               => makeCall('DELETE',   url, null, opts as never),
    options: (url: string, opts?: object)               => makeCall('OPTIONS',  url, null, opts as never),
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
    await (new AF('api', 'env', 'console', code))(api, envVars, con);
  } catch (e) {
    logs.push({ level: 'error', msg: `Script error: ${(e as Error).message}` });
    onUpdate(calls.map((c) => ({ ...c })), [...logs]);
  }

  return { calls, logs };
}
