---
name: bulky-api
description: Drive the BulkyApi MCP server — list and edit the user's saved collections, environments, and api.* scripts, and run real HTTP calls from them. Use when asked to call an API, test an endpoint, run or write a saved request, import a curl command, or read/change BulkyApi collections and environment variables.
---

# BulkyApi via MCP

BulkyApi is an HTTP client whose requests are **JavaScript scripts** against an
`api.*` DSL, not static request forms. The `bulky-api` MCP server exposes that
whole surface: the saved tree, the editor, and the runner.

If the tools are missing from the session, the server is not registered — see
`mcp/README.md` (`pnpm mcp:install && pnpm mcp:build`, then `/mcp` to confirm).

## Pick the right tool

| Situation | Tool |
| --- | --- |
| One-off call, nothing saved involved | `bulky_http_request` |
| "Run my X request" / "test the login flow" | `bulky_get_item` → `bulky_run_item` |
| Multi-step flow, or a script you just wrote | `bulky_analyze_script` → `bulky_run_script` |
| "Here's a curl command" | `bulky_curl_to_script` → `bulky_save_item` |
| "What APIs do I have?" | `bulky_list_collections` |
| Tokens, base URLs, secrets | `bulky_list_environments`, `bulky_set_env_vars` |
| A state tool errors | `bulky_whoami` first |

Reach for a saved item before writing a script from scratch — the user usually
already has the request, with auth wired to their environment.

## Script surface

```js
// note: label shown on the next call
const r = await api.get('{{baseUrl}}/users/1');          // {{name}} interpolation
const s = await api.post(`${env.baseUrl}/users`, { name: 'Ada' }, {
  auth: { type: 'bearer', token: env.token },            // or 'basic' / 'apikey'
  headers: { 'X-Trace': 'mcp' },
});
console.log(s.status, s.data);                           // returned as logs
env.newUserId = s.data.id;                               // returned as extractedVars
```

- Verbs: `get`, `post`, `put`, `patch`, `delete`, `options`; each resolves to
  `{ data, status, headers, ok }`. `api.sse(url, opts?, onEvent)` for streams.
- With no `opts.auth`, an `env.token` becomes a bearer header automatically.
- `api.server.*` is the same as `api.*` here — the app's `/api/proxy` only
  exists to escape browser CORS and is not in play.
- Top-level `await` works. `process`, `require`, and the filesystem do not
  exist inside a script.

## Workflows

**Run something the user already has**

1. `bulky_list_collections` to find the item (add `includeCode` only if you
   need to read the scripts to pick one).
2. `bulky_run_item` with its `itemId`.
3. Read back `calls[].statusCode`, `logs`, and `extractedVars`. Report what the
   API returned, not just that it ran.

**Write a new request**

1. Check `bulky_list_environments` for an existing `baseUrl` / `token` and use
   `env.*` instead of hardcoding — never paste a literal token into a script.
2. `bulky_analyze_script` to confirm the URLs resolve the way you expect.
   Nothing is sent, so this is free.
3. `bulky_run_script`.
4. Save it with `bulky_save_item` only when the user wants it kept.

**Import a curl command**

`bulky_curl_to_script` → show the script → `bulky_save_item` if wanted. The
conversion drops `-u` and `-b`; re-add those as `opts.auth` or a header.

**Debug a failing call**

Read `calls[].error` first — a timeout, a DNS failure, and a 4xx are different
problems. Then `calls[].requestHeaders` and `requestBody` to see what actually
went out; an unresolved `{{var}}` left in a URL means the environment is
missing that variable.

## Rules

- **Confirm before destructive writes.** `bulky_delete_item`,
  `bulky_delete_collection`, and `bulky_delete_environment` have no undo, and
  deleting a collection takes its items and environments with it.
- **Never print secrets.** `includeValues` / `includeVarValues` are off by
  default for a reason. Read a token into a script via `env.token`; do not echo
  it into the conversation, a log line, or a saved script body.
- **Non-GET calls hit the real API.** A `POST` from here creates a real record.
  Say what a script will do before running one that writes, and prefer
  `bulky_analyze_script` when the target is unfamiliar.
- **Respect the limits** rather than working around them: 30s per call, 50
  calls per run, response bodies truncated past 20,000 characters. Raise
  `maxCalls` or `maxBodyChars` deliberately when a task genuinely needs it.
- **Warn about open tabs.** Every write returns a note that an already-open
  BulkyApi tab syncs whole snapshots and can overwrite the change. Pass it on.
- Environment writes merge by default; `replace: true` drops every variable not
  in the payload.
