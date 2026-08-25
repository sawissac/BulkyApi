import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { analyzeScript } from "../analyze.js";
import { config } from "../config.js";
import { curlToScript, parseCurl } from "../curl.js";
import { runScript } from "../runner.js";
import { findItem, resolveEnvVars } from "../state.js";
import { clampBody, guard, ok, summarizeCalls } from "./shared.js";

const RUN_LIMITS = {
  timeoutMs: z.number().int().positive().optional().describe("Per-call timeout in ms."),
  scriptTimeoutMs: z.number().int().positive().optional().describe("Ceiling for the whole run in ms."),
  maxCalls: z.number().int().positive().optional().describe("Refuse to issue more calls than this."),
  maxBodyChars: z.number().int().positive().optional().describe("Truncate each response body past this many characters."),
};

export function registerExecuteTools(server: McpServer): void {
  server.registerTool(
    "bulky_http_request",
    {
      title: "Send one HTTP request",
      description:
        "Sends a single request straight from this machine and returns status, headers, and body. No collection or environment involved — for anything multi-step or variable-driven use bulky_run_script.",
      inputSchema: {
        method: z.string().describe("HTTP method, e.g. GET or POST."),
        url: z.string().describe("Absolute URL."),
        headers: z.record(z.string(), z.string()).optional().describe("Request headers."),
        body: z
          .unknown()
          .optional()
          .describe("Request body. An object is sent as JSON; a string is sent verbatim. Ignored for GET/HEAD/OPTIONS."),
        timeoutMs: RUN_LIMITS.timeoutMs,
        maxBodyChars: RUN_LIMITS.maxBodyChars,
      },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    guard(async ({ method, url, headers, body, timeoutMs, maxBodyChars }) => {
      const upper = method.toUpperCase();
      const started = Date.now();
      const init: RequestInit = {
        method: upper,
        headers: headers ?? {},
        signal: AbortSignal.timeout(timeoutMs ?? config.defaultTimeoutMs),
      };
      if (body !== undefined && body !== null && !["GET", "HEAD", "OPTIONS"].includes(upper)) {
        init.body = typeof body === "string" ? body : JSON.stringify(body);
        if (!Object.keys(init.headers as Record<string, string>).some((h) => h.toLowerCase() === "content-type")) {
          (init.headers as Record<string, string>)["Content-Type"] = "application/json";
        }
      }

      const res = await fetch(url, init);
      const text = await res.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      return ok({
        method: upper,
        url,
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        durationMs: Date.now() - started,
        headers: Object.fromEntries([...res.headers.entries()]),
        body: clampBody(data, maxBodyChars),
      });
    }),
  );

  server.registerTool(
    "bulky_run_script",
    {
      title: "Run a BulkyApi script",
      description:
        "Executes an api.* automation script headlessly and returns every call it made, its console output, and any variable the script changed. " +
        "Surface: api.get/post/put/patch/delete/options(url, body?, opts?) -> { data, status, headers, ok }, api.sse(url, opts?, onEvent), " +
        "env.<name> for variables, {{name}} interpolation in URLs, and `// note: text` to label the next call. api.server.* is accepted and behaves like api.*. " +
        "Variables come from environmentId or collectionId when given, and env patches them.",
      inputSchema: {
        code: z.string().describe("The script body. Top-level await is available."),
        environmentId: z.string().optional().describe("Load variables from this environment."),
        collectionId: z
          .string()
          .optional()
          .describe("Load variables from this collection's active environment. Ignored when environmentId is set."),
        env: z.record(z.string(), z.string()).optional().describe("Variable overrides merged last. Not written back."),
        ...RUN_LIMITS,
      },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    guard(async ({ code, environmentId, collectionId, env, timeoutMs, scriptTimeoutMs, maxCalls, maxBodyChars }) => {
      const { vars, environmentName } = await resolveEnvVars({
        environmentId,
        collectionId,
        overrides: env,
      });

      const result = await runScript(code, vars, { timeoutMs, scriptTimeoutMs, maxCalls });

      return ok({
        environment: environmentName,
        callCount: result.calls.length,
        aborted: result.aborted,
        error: result.error,
        calls: summarizeCalls(result.calls, maxBodyChars),
        logs: result.logs,
        extractedVars: result.extractedVars,
      });
    }),
  );

  server.registerTool(
    "bulky_run_item",
    {
      title: "Run a saved item",
      description:
        "Runs the script stored on a saved item, with that item's collection environment applied. Same result shape as bulky_run_script. The item is not modified.",
      inputSchema: {
        itemId: z.string().optional().describe("Item to run."),
        name: z.string().optional().describe("Item name, when no id is known."),
        environmentId: z.string().optional().describe("Override which environment the run uses."),
        env: z.record(z.string(), z.string()).optional().describe("Variable overrides merged last. Not written back."),
        ...RUN_LIMITS,
      },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    guard(async ({ itemId, name, environmentId, env, timeoutMs, scriptTimeoutMs, maxCalls, maxBodyChars }) => {
      if (!itemId && !name) throw new Error("Pass itemId or name.");
      const { item, collection } = await findItem({ itemId, name });
      const { vars, environmentName } = await resolveEnvVars({
        environmentId,
        collectionId: collection.id,
        overrides: env,
      });

      const result = await runScript(item.code, vars, { timeoutMs, scriptTimeoutMs, maxCalls });

      return ok({
        item: { id: item.id, name: item.name, collection: collection.name },
        environment: environmentName,
        callCount: result.calls.length,
        aborted: result.aborted,
        error: result.error,
        calls: summarizeCalls(result.calls, maxBodyChars),
        logs: result.logs,
        extractedVars: result.extractedVars,
      });
    }),
  );

  server.registerTool(
    "bulky_analyze_script",
    {
      title: "Preview a script's calls",
      description:
        "Static read of which calls a script would make, with variables substituted into the URLs. Nothing runs and no request is sent — use it to check a script before bulky_run_script.",
      inputSchema: {
        code: z.string().describe("The script body to inspect."),
        environmentId: z.string().optional().describe("Substitute this environment's variables into the URLs."),
        collectionId: z.string().optional().describe("Substitute this collection's active environment."),
        env: z.record(z.string(), z.string()).optional().describe("Extra variable values for the preview."),
      },
      annotations: { readOnlyHint: true },
    },
    guard(async ({ code, environmentId, collectionId, env }) => {
      const { vars, environmentName } = await resolveEnvVars({ environmentId, collectionId, overrides: env });
      const calls = analyzeScript(code, vars);
      return ok({
        environment: environmentName,
        callCount: calls.length,
        calls: calls.map((call) => ({
          idx: call.idx,
          method: call.method,
          url: call.url,
          urlExpr: call.urlExpr,
          note: call.note,
        })),
      });
    }),
  );

  server.registerTool(
    "bulky_curl_to_script",
    {
      title: "Convert curl to a script",
      description:
        "Turns a curl command into a BulkyApi script — the same conversion the app's cURL import does. Pair it with bulky_save_item to store the result.",
      inputSchema: { curl: z.string().describe("A curl command, line continuations allowed.") },
      annotations: { readOnlyHint: true },
    },
    guard(async ({ curl }) => {
      const parsed = parseCurl(curl);
      if (!parsed) throw new Error("Could not find a URL in that curl command.");
      return ok({
        method: parsed.method,
        url: parsed.url,
        headers: parsed.headers,
        code: curlToScript(parsed),
      });
    }),
  );
}
