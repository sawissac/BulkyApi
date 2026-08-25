# BulkyApi MCP server

A stdio [MCP](https://modelcontextprotocol.io) server that gives Claude the
same three things the BulkyApi UI gives a person:

- the saved **collections, items, and environments**,
- the ability to **edit** them,
- the **`api.*` script runner** that turns them into real HTTP traffic.

State is read from and written to the same Supabase rows the web app syncs, as
the signed-in user — Row Level Security scopes access, and this server keeps no
data of its own.

## Setup

```bash
pnpm mcp:install     # or: pnpm -C mcp install
pnpm mcp:build       # compiles mcp/src -> mcp/dist
```

Give the account a password, if it does not have one. BulkyApi signs in by
magic link, so an account created that way has no password until one is set:
open `/login`, sign in with a link, then use **Set a password** on that screen.

Add the credentials to the repo's `.env.local` (the server loads it
automatically, walking up from `mcp/dist`):

```bash
BULKY_EMAIL=you@example.com
BULKY_PASSWORD=your-bulkyapi-password
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are picked
up from the same file. `BULKY_SUPABASE_URL` / `BULKY_SUPABASE_KEY` override them
when the server should point at a different project.

### Registering with Claude Code

The repo ships a project-scoped [`.mcp.json`](../.mcp.json), so Claude Code in
this directory offers the server on start. To register it globally instead:

```bash
claude mcp add bulky-api -- node /absolute/path/to/BulkyApi/mcp/dist/index.js
```

Verify from a session with `/mcp`, or call `bulky_whoami` — it reports the
project, the signed-in account, and which env file was loaded.

## Tools

**Connection**

| Tool | What it does |
| --- | --- |
| `bulky_whoami` | Configuration and sign-in status. Start here when a state tool fails. |

**Collections** (needs credentials)

| Tool | What it does |
| --- | --- |
| `bulky_list_collections` | The whole tree. Script bodies and variable values are omitted unless asked for. |
| `bulky_get_item` | One item's full script, by id or name. |
| `bulky_save_item` | Create or update an item. |
| `bulky_delete_item` | Delete an item. |
| `bulky_create_collection` | Create an empty collection. |
| `bulky_delete_collection` | Delete a collection and everything in it. |

**Environments** (needs credentials)

| Tool | What it does |
| --- | --- |
| `bulky_list_environments` | Environments and variable names; values on request. |
| `bulky_set_env_vars` | Merge (or replace) variables, creating the environment if needed. |
| `bulky_delete_env_vars` | Remove named variables. |
| `bulky_delete_environment` | Delete an environment. |

**Execution** (works with no credentials)

| Tool | What it does |
| --- | --- |
| `bulky_http_request` | One request, straight out. |
| `bulky_run_script` | Run an `api.*` script with an environment applied. |
| `bulky_run_item` | Run a saved item with its collection's environment. |
| `bulky_analyze_script` | Static preview of the calls a script would make. Sends nothing. |
| `bulky_curl_to_script` | curl → BulkyApi script, same conversion as the app's import. |

**Resources**

- `bulky://collections` — the tree as JSON.
- `bulky://item/{itemId}` — one item's script body.

## The script surface

Scripts use the same DSL as the app, so anything saved there runs here
unchanged:

```js
// note: fetch the user, then update it
const r = await api.get('{{baseUrl}}/users/1');
console.log(r.status, r.data);

const s = await api.post(`${env.baseUrl}/users`, { name: 'Ada' }, {
  auth: { type: 'bearer', token: env.token },
  headers: { 'X-Trace': 'mcp' },
});

env.newUserId = s.data.id;   // reported back as extractedVars
```

- `api.get/post/put/patch/delete/options(url, body?, opts?)` → `{ data, status, headers, ok }`
- `api.sse(url, opts?, onEvent)` — collected for `BULKY_SSE_WINDOW_MS` then closed
- `env.<name>` and `{{name}}` interpolation in URLs
- `// note: text` labels the next call
- `opts.auth`: `{ type: 'bearer' | 'basic' | 'apikey', ... }`; with no `auth`, an
  `env.token` becomes a bearer header, matching the app
- `api.server.*` is accepted and behaves exactly like `api.*`

### Differences from the browser runner

`src/lib/scriptRunner.ts` routes `api.server.*` through `/api/proxy` purely to
escape CORS. A Node process has no such restriction, so both forms call the
target directly and the app's proxy route is not involved. There is also no
step/pause mode — a run goes start to finish and returns the whole call list.

## Limits and safety

- Every call is bounded by `BULKY_TIMEOUT_MS` (30s), every run by four times
  that, and every run by `BULKY_MAX_CALLS` (50) calls.
- Response bodies are truncated past 20,000 characters, and the result says so.
- Scripts execute in a `node:vm` context holding only `api`, `env`, `console`,
  timers, and a few web primitives — no `process`, `require`, or filesystem.
  That is isolation, not a security boundary: Node documents `vm` as unsafe for
  untrusted code. These scripts are the user's own, and they reach the network.

### Writes and the web app

This server writes rows directly. The web app pushes its entire Redux tree
through the `sync_state` RPC, which deletes any row absent from that snapshot —
so a BulkyApi tab that was already open before a write here can undo it on its
next save. **Reload any open tab before editing there.** Every write tool
returns this warning alongside its result.

## Smoke test

```bash
pnpm mcp:smoke
```

Starts a throwaway HTTP server on port 4599 and drives the MCP server against
it over stdio — tools, resources, curl conversion, static analysis, a run with
variables, auth, SSE, and the call cap. It needs no credentials; the two
state-backed calls are expected to report missing configuration.
