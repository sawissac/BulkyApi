# Bulky API — Standard Operating Procedure (SOP)

**Version:** 1.0.0
**Author:** WAUX Studio
**Last Updated:** August 29, 2026

---

## 1. Overview

Bulky API is a JavaScript-based API automation client. Developers and QA engineers
write chained API scripts, the right panel auto-builds a call card per request,
and every response is inspectable inline — all from a single window.

Runs as a Next.js 16 web app and as an installable PWA. Optionally signs in to a
Supabase project to sync all state across devices; with no project configured it
runs fully local-only.

---

## 2. Interface Layout

| Region | Purpose |
|---|---|
| **Activity Rail** (48px, far left) | Brand mark, active-environment badge, section tabs, run status, account/sync, display mode, Tweaks |
| **Sidebar pane** | Body of the section picked in the rail: Requests, Envs, Vars, File |
| **Middle Editor** | Monaco editor — write and edit automation scripts (TypeScript buffer, runs as JavaScript) |
| **Right Panel** | Auto-built call cards; Cards / Waterfall / Docs views; console at the bottom |

The three panes are resizable. Rail tabs:

| Tab | Shows |
|---|---|
| **Requests** | Collections, each holding request items |
| **Envs** | Environments for the active collection |
| **Vars** | Key–value pairs for the active environment |
| **File** | Save / import scripts and collections, cURL import, recent files |

---

## 3. Writing a Script

### 3.1 Available API Methods

```js
await api.get(url, opts?)
await api.post(url, body, opts?)
await api.put(url, body, opts?)
await api.patch(url, body, opts?)
await api.delete(url, opts?)
await api.options(url, opts?)
await api.head(url, opts?)                 // headers only — no response body
await api.sse(url, opts?, onEvent?)        // Server-Sent Events; returns { close() }
```

Every verb also exists on **`api.server.*`** (`api.server.get(...)`, etc.), which
routes the call through the app's own proxy at `/api/proxy`. Reach for it when
CORS blocks the browser from calling a host directly.

Each non-SSE call resolves to `{ data, status, headers, ok }`.

The runtime also injects `expect(...)` and `api.assert(...)` for checks (§3.5),
`sleep(ms)` for delays, `api.file(accept?)` / `api.form(fields)` for uploads
(§3.7), and a writable `env` (§3.4).

Responses can be typed for editor help — the buffer is TypeScript and types are
stripped before execution:

```ts
type User = { id: number; name: string };
const r = await api.get<User[]>('{{baseUrl}}/users');
```

### 3.2 Using Environment Variables

```js
// In code — env.key
const res = await api.get(env.baseUrl + '/users');

// Inline in a URL string — {{key}}
const res = await api.get('{{baseUrl}}/users');
```

Both resolve against the **active environment** at run time. An unresolved
`{{key}}` is left in the URL literally so the miss is visible on the card.

### 3.3 Chaining Calls

```js
const users = await api.get(env.baseUrl + '/users');
const posts = await api.get(`${env.baseUrl}/posts?userId=${users.data[0].id}`);
await api.post(env.baseUrl + '/posts', {
  title: 'New Post',
  userId: users.data[0].id
});
```

### 3.4 Writing Values Back to the Environment

`env` is writable during a run. Assign directly, or use `env.set` / `env.get`:

```js
const login = await api.post(env.baseUrl + '/auth', { user: 'u', pass: 'p' });
env.token = login.data.accessToken;        // direct assignment
env.set('userId', login.data.id);          // same effect, coerces to string
const t = env.get('token');                // read it back later in the run
```

Every changed variable appears in the **Extracted** panel below the call cards.
Use **promote all → \<env\>** (or the per-row **→ env**) to persist them into the
active environment, instead of copy-pasting tokens between runs.

### 3.5 Assertions & Delays

`expect(actual)` returns a chainable matcher; `api.assert(condition, message?)`
is the shorthand. Neither throws — a failed check is recorded, not fatal, so one
script can verify many things and report them all.

```js
const r = await api.get(env.baseUrl + '/users');
expect(r).toHaveStatus(200);
expect(r).toBeOk();
expect(r.data.length).toBeGreaterThan(0);
expect(r.data[0]).toHaveProperty('id');
expect(r.data[0].name).not.toBe('');
api.assert(r.ok, 'user list request succeeded');

await sleep(500);                           // wait 500ms (e.g. before polling)
```

Matchers: `toBe`, `toEqual`, `toBeTruthy`, `toBeFalsy`, `toBeDefined`,
`toBeNull`, `toContain`, `toMatch`, `toBeGreaterThan`, `toBeLessThan`,
`toHaveProperty`, `toHaveStatus`, `toBeOk` — each also under `.not`.

Results show three places:

- a `✓`/`✗` badge and a **Tests** tab on the matching call card;
- the **Tests** strip under the call list — run total `✓ N  ✗ M` and every check;
- one line per check in the Console.

`sleep(ms)` rejects immediately if the run is stopped.

### 3.6 Authentication

```js
// Bearer token
await api.get(url, { auth: { type: 'bearer', token: 'my-token' } });

// Basic auth
await api.get(url, { auth: { type: 'basic', username: 'u', password: 'p' } });

// API Key header
await api.get(url, { auth: { type: 'apikey', header: 'X-API-Key', key: 'abc' } });
```

If no `auth` is given and the active environment has a `token` variable, calls
are sent with `Authorization: Bearer <env.token>` automatically.

### 3.7 File Uploads

`api.file(accept?)` opens the browser's native file picker and resolves with
the chosen `File`. `api.form(fields)` builds a multipart body from it:

```js
const picked = await api.file('image/*');
const r = await api.post(
  env.baseUrl + '/upload',
  api.form({ file: picked, caption: 'from Bulky' }),
);
```

A `File`/`Blob` also works as the body directly, for a raw (non-multipart)
upload. Neither is JSON-encoded and neither gets the default
`Content-Type: application/json` — the browser sets its own (the multipart
boundary for `api.form()`, the file's type for a bare `File`/`Blob`). Works
through `api.server.*` too: the proxy **streams** the upload straight to the
target instead of wrapping it in JSON, so files pass through it uncorrupted.

The Payload tab lists field names and file sizes instead of a JSON dump, and
**Copy as cURL** emits `-F` flags for a multipart body (§5).

### 3.8 Annotating Calls

A `// note:` line attaches a label to the **next** call card:

```js
// note: create the user first
const created = await api.post(env.baseUrl + '/users', { name: 'Ada' });
```

### 3.9 Console Logging

```js
console.log('Message');
console.info('Detail');
console.warn('Warning');
console.error('Error');
```

Output appears in the console panel at the bottom of the right panel.

---

## 4. Running a Script

1. Write or load a script in the middle editor.
2. The right panel builds call cards from the script as you type (idle state).
3. Press **Run** (or `⌘ + Enter` / `Ctrl + Enter`).
4. Each card updates live: `idle → pending → 200 / err`.
5. Click any card to expand and inspect results.

### 4.1 Step Mode

Toggle **Step** in the right-panel header (disabled mid-run). With step mode on,
the run pauses before each call; press **Next** in the editor toolbar to advance
one call at a time. The rail status dot turns amber while paused.

### 4.2 Stopping a Run

**Stop** in the editor toolbar aborts the run. The in-flight call is marked
`Aborted by user` and the script halts.

### 4.3 Per-Call Timeout

Set a timeout (ms) in **Tweaks**. A call that exceeds it errors with
`Timeout: call exceeded <n>ms` and the script stops. Empty / `0` disables it.

### 4.4 Pre-run / Post-run Hooks

Open a collection's **run hooks** control (the workflow icon on its row; an
accent dot means one is set) to attach two collection-level scripts:

- **Pre-run** — runs once before the request script on *every* run of *any*
  request in the collection. Use it to authenticate once or seed data.
- **Post-run** — runs once after the request script. Use it for cleanup.

All three run in one pass and share `api`, `console`, `sleep`, `expect` and the
same environment. Pass data forward with `env.set('token', …)` in the pre-run
and read it with `env.get('token')` (or `{{token}}`) later — **local variables
do not cross** between the segments. Their calls appear as ordinary cards.
A blank hook does nothing. A `return` or a throw in the request script can
skip the post-run, so it is best-effort teardown, not a `finally`.

---

## 5. Inspecting Results

The right panel has three views (switch in its header; each request remembers its
last view):

| View | Shows |
|---|---|
| **Cards** | One expandable card per call |
| **Waterfall** | Calls on a time axis — duration and ordering |
| **Docs** | Generated request/response reference for the built calls |

Each card expands to these tabs:

| Tab | Shows |
|---|---|
| **Response** | JSON tree viewer (Pretty / Raw / TS toggle). Non-JSON bodies render as indented XML / HTML (with a sandboxed **Preview** for HTML), plain text, or an inline image. |
| **Headers** | Response headers as key–value pairs |
| **Auth** | Auth method used, masked token / key |
| **Payload** | Request headers and request body sent. A file upload (§3.7) lists field names and file sizes instead of a JSON dump. |
| **Status** | HTTP status code, duration, timestamp, host |
| **Tests** | Recorded expectations for this call — only when the run made any (§3.5) |

The card header also carries a **copy-as-cURL** button (once the call has left
`idle`) — it copies a runnable `curl` built from the resolved URL, the headers
actually sent, and the body (JSON as `-d`, an upload as `-F` fields) — plus a
`✓`/`✗` assertion badge when the call has recorded checks.

SSE calls list each streamed event under the card as it arrives.

Below the call list, a **Tests** strip appears whenever a run recorded
expectations: the run total (`✓ N  ✗ M`) and one row per check. The **console
panel** at the bottom collects `console.*` output and script errors (and one
line per assertion); it has an expand / collapse toggle.

---

## 6. Managing Requests

- The **Requests** tab holds **collections**; each collection holds request
  **items**.
- Click an item to load its script into the editor.
- `+` adds a collection or an item. Names are edited inline. Deleting prompts a
  confirmation.
- Each item shows a method badge (`GET` / `POST` / …).
- With no item active the editor is a **scratch pad** — the buffer stays but is
  not saved to any item.
- The editor footer's **Examples** menu offers ready-made scripts (Simple GET,
  POST with body, Chain, Bearer auth, SSE, …), previewed in a dialog before they
  replace the buffer. **Format** runs Prettier over the buffer.

---

## 7. Environments & Variables

### 7.1 Environments Are Per-Collection

Each collection carries its own list of environments and its own active
selection. Switching collections switches the available environments. A global
**Base** layer (see §7.3) sits under every environment regardless of collection.

### 7.2 Switching Environments

1. Open the **Envs** tab.
2. Click an environment to activate it.
3. All `env.*` and `{{…}}` references resolve to that environment's values. The
   active environment name also shows on the Activity Rail.

### 7.3 Viewing & Editing Variables

The **Vars** tab shows two stacked sections:

- **Base · all environments** — a single global bag every environment in every
  collection inherits. Always editable, even with no collection open.
- **`<Environment>` Variables** — the active environment's own key–value pairs.

A key defined in both wins in the environment; the Base row for it is shown
struck through with an **overridden** badge. Click a key to rename it, a value
to edit it, **+** to add, the trash icon to delete (confirmed). Sensitive
values (keys containing `token`, `key`, `secret`, `password`) are masked with
`••••••••` and have a reveal toggle.

### 7.4 Using Variables in Scripts

```js
env.baseUrl            // → https://jsonplaceholder.typicode.com
env.token              // → masked in UI, sent as Bearer automatically
'{{baseUrl}}/users'    // inline form, same resolution
```

### 7.5 Extracted Variables

Values assigned to `env.*` during a run appear in the **Extracted** panel and can
be promoted into the active environment (see §3.4).

---

## 8. File Actions

| Action | Description |
|---|---|
| **Save Script** | Export the current editor buffer as `.js` |
| **Import Script** | Load a `.js` file into the editor |
| **Export Collection** | Save collections as JSON (`{ "collections": [...] }` wrapper) |
| **Import Collection** | Load collection JSON — a single object, an array, or the wrapped form |
| **Import from cURL** | Paste a curl command to auto-generate a script |
| **Recent** | Quick access to recently used files |

Collections are portable JSON, so one can be hand-authored and imported. Ids in a
hand-written file are placeholders — they are reassigned on import. The
Collections-pane importer takes one object or an array; the File-pane importer
also accepts the `{ "collections": [...] }` wrapper and a legacy top-level
`environments`.

---

## 9. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘ + Enter` / `Ctrl + Enter` | Run script |
| `Shift + Alt + F` | Format document |
| `Tab` | Indent 2 spaces in editor |
| Click card | Expand / collapse response detail |

---

## 10. Theming, Layout & Display

Open **Tweaks** from the Activity Rail.

| Option | Values |
|---|---|
| **Color Theme** | Midnight, Ocean, Chocolate, Amethyst, Nature, Rose, Amber, Slate, Sunset, Coffee |
| **Layout** | Balanced (even split), Editor Focus (wide editor), Response Focus (wide response panel) |
| **Call timeout** | Per-call timeout in ms, with a clear button |

**Display mode** is separate — the laptop icon on the Activity Rail:

| Mode | Effect |
|---|---|
| **URL view** | Normal browser window |
| **Fullscreen view** | Fullscreen API; app fills the screen. Never restored automatically on reload |

---

## 11. Sync & Account

Optional, and only active when the app is built with Supabase environment
variables.

- **Configured + signed in** — collections, environments, editor, and UI state
  sync across devices. Sign in from the account control on the Activity Rail
  (`/login`) via a **magic link** or **email + password**. A magic-link account
  has no password until one is set while signed in.
- **Configured + signed out** — local-only until sign-in; the app is fully
  usable.
- **Not configured** — local-only mode. The account control explains this rather
  than showing a dead form.
- **Sync status** shows on the rail (`idle` / `pulling` / `pushing` / `synced` /
  `error`); a red dot marks the last sync as failed.
- **Sign out** clears the Supabase session and drops the local cache so the next
  person on that browser starts clean.

---

## 12. Proxy

`api.server.*` and any call that would otherwise hit CORS route through
`/api/proxy`:

- Aborts the upstream fetch after **30s** (`Proxy timeout after 30000ms`).
- A plain JSON call is wrapped in a `{ method, url, headers, body }` envelope.
  A file upload (§3.7) instead **streams** straight through — the proxy never
  buffers or re-encodes it — with the target url/method/headers riding in
  `X-Proxy-*` request headers alongside the untouched multipart/binary body.
- When signed out of a configured Supabase project (§11), every `/api/*` route
  — this one included — answers `401 unauthorized`; local-only mode (no
  Supabase project) leaves it open, since there is nothing to sign into.

---

## 13. Error Handling

| Scenario | Behavior |
|---|---|
| Network error | Card shows `err`, message in the console |
| HTTP 4xx / 5xx | Card shows the status code in red, expandable detail |
| Script syntax error | Console shows `Script error: …`; no cards run |
| Run stopped | In-flight call marked `Aborted by user`, script halts |
| Per-call timeout | Card errors `Timeout: call exceeded <n>ms`, script stops |
| Proxy timeout | `Proxy timeout after 30000ms` |
| SSE failure | Card shows `HTTP <status>` or `No response body` |
| Unresolved variable | `{{name}}` left literal in the URL |
| Sync failure | Rail sync status `error` + red dot; app keeps working local |

---

## 14. Best Practices

- Set `env.baseUrl` before running scripts against an API.
- Use `console.log()` to inspect intermediate values between chained calls.
- Use **step mode** to walk a chain call-by-call while debugging.
- Label calls with `// note:` so the cards read as a sequence.
- Add `expect(...)` / `api.assert(...)` checks so a run reports pass/fail, not
  just status codes; they never abort the run.
- Assign to `env.*` (or `env.set`) and **promote** instead of hand-copying
  tokens between runs.
- Reach for `api.server.*` when CORS blocks a host.
- Keep one scenario per request item; name items descriptively
  (`create-user-and-verify`).
- Set the environment `token` variable once for Bearer auth rather than repeating
  `auth` in every call.

---

## 15. PWA

`pnpm build && pnpm start`, then install from the browser address bar. The app
shell is cached on first load for offline use; the service worker registers only
in a production build. Persisted responses are capped at 50KB per entry to keep
the local store bounded.
