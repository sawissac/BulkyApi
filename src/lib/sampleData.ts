export type CollectionItem = {
  id: string;
  name: string;
  method: string;
  code: string;
};

export type Collection = {
  id: string;
  name: string;
  open: boolean;
  items: CollectionItem[];
  environments: Environment[];
  envIdx: number;
  /** Script run once before the item script on every run of any item in this
   *  collection — auth, seed data. Blank/absent means no pre-run step. */
  preRun?: string;
  /** Script run once after the item script on every run — cleanup, teardown.
   *  Runs even when the item script throws is NOT guaranteed; see
   *  `composeScript`. Blank/absent means no post-run step. */
  postRun?: string;
};

export type Environment = {
  id: string;
  name: string;
  vars: Record<string, string>;
};

export const SAMPLE_CODE = `// Bulky API — Automation Script
// Available: api.get/post/put/patch/delete(url, body?, opts?)
// Environment vars: env.baseUrl, env.token, etc.
// Chain, loop, test — full async JS support

// 1. Fetch all users
const users = await api.get(env.baseUrl + '/users');
console.log('Fetched', users.data.length, 'users');

// 2. Get posts for the first user
const firstUser = users.data[0];
const posts = await api.get(\`\${env.baseUrl}/posts?userId=\${firstUser.id}\`);

// 3. Create a new post
const created = await api.post(env.baseUrl + '/posts', {
  title: 'Bulky API Automation',
  body: 'Generated via chained script',
  userId: firstUser.id
});

// 4. Update the created post
const updated = await api.put(\`\${env.baseUrl}/posts/\${created.data.id}\`, {
  title: 'Updated by Bulky API',
  body: 'This post was updated in a single script run',
  userId: 1
});

console.log('Done! Ran 4 chained API calls.');
`;

export const INITIAL_COLLECTIONS: Collection[] = [
  {
    id: 'mock-collection-1',
    name: 'JSONPlaceholder',
    open: true,
    items: [
      {
        id: 'mock-item-1',
        name: 'Get Users',
        method: 'GET',
        code: `const r = await api.get(env.baseUrl + '/users');\nconsole.log('status:', r.status, '| count:', r.data.length);\n`,
      },
    ],
    environments: [
      {
        id: 'mock-env-dev',
        name: 'Development',
        vars: {
          baseUrl: 'https://jsonplaceholder.typicode.com',
          token: 'dev-a1b2c3d4e5f6',
          apiKey: 'dev-key-123456',
          timeout: '5000',
        },
      },
      {
        id: 'mock-env-prod',
        name: 'Production',
        vars: {
          baseUrl: 'https://api.example.com',
          token: 'prod-9f8e7d6c5b4a',
          apiKey: 'prod-key-987654',
          timeout: '10000',
        },
      },
    ],
    envIdx: 0,
  },
];

export const DOCS_CODE = `// ═══════════════════════════════════════════════════════
//  BULKY API — SCRIPT REFERENCE
// ═══════════════════════════════════════════════════════
//
//  Every script runs in an async context.
//  Three globals are always available:
//    api      — HTTP client
//    env      — environment variables (set in Env pane)
//    console  — .log / .warn / .error / .info
//
// ── api methods ─────────────────────────────────────────
//
//  api.get(url, opts?)
//  api.post(url, body, opts?)
//  api.put(url, body, opts?)
//  api.patch(url, body, opts?)
//  api.delete(url, opts?)
//  api.options(url, opts?)
//  api.head(url, opts?)
//
//  Returns: { data, status, headers, ok }
//
//  api.sse(url, opts?, onEvent?)
//
//  Opens a Server-Sent Events stream.
//  onEvent(event) fires for each received event.
//  Returns: Promise<{ close() }>
//
//  event: { type, data, id }  — type defaults to 'message'
//
// ── opts ────────────────────────────────────────────────
//
//  {
//    headers: { 'X-Custom': 'value' },
//    auth: {
//      type: 'bearer',  token: 'abc',
//      // or
//      type: 'basic',   username: 'u',  password: 'p',
//      // or
//      type: 'apikey',  key: 'k',       header: 'X-API-Key',
//    }
//  }
//
//  If env.token is set, Bearer auth is applied automatically
//  to every call. Pass auth in opts to override per-call.
//
// ── env ─────────────────────────────────────────────────
//
//  Access any variable from the active environment:
//    env.baseUrl   env.token   env.apiKey   (any custom var)
//
//  Also usable inline as {{varName}} in URL strings:
//    api.get('{{baseUrl}}/users')
//
// ── console ─────────────────────────────────────────────
//
//  Outputs appear in the Console panel at the bottom.
//  console.log / .warn / .error / .info
//
// ═══════════════════════════════════════════════════════
//  Runnable example — chained requests
// ═══════════════════════════════════════════════════════

const users = await api.get(env.baseUrl + '/users');
console.log('users fetched:', users.data.length);

const first = users.data[0];
const posts = await api.get(\`\${env.baseUrl}/posts?userId=\${first.id}\`);
console.log('posts for user', first.id, ':', posts.data.length);

const created = await api.post(env.baseUrl + '/posts', {
  title: 'Bulky API — chained',
  body: 'Created via script',
  userId: first.id,
});
console.log('created id:', created.data.id, '| status:', created.status);
`;

export type ExampleScript = { label: string; method: string; markdown: string; code: string };

export const EXAMPLE_SCRIPTS: ExampleScript[] = [
  {
    label: "API Reference",
    method: "DOCS",
    markdown: `## API Reference

Everything the runtime injects into a script: the \`api\` client, the \`env\` bag, and \`console\`. The editor is TypeScript — annotate freely, the types are stripped before the script runs.

### Globals

| Name | Type | Description |
|------|------|-------------|
| \`api\` | \`BulkyApi\` | HTTP client — \`get\`, \`post\`, \`put\`, \`patch\`, \`delete\`, \`options\`, \`head\`, \`sse\`, \`stream\`, \`assert\` |
| \`env\` | \`Record<string, string>\` | Active environment variables. Writable — \`env.x = v\` / \`env.set('x', v)\` is visible to later calls |
| \`console\` | \`Console\` | \`.log\` / \`.warn\` / \`.error\` / \`.info\` — output lands in the Console panel |
| \`expect\` | \`(actual) => Matchers\` | Records a pass/fail check. Never throws — see **Assertions** |
| \`sleep\` | \`(ms) => Promise<void>\` | Waits \`ms\` milliseconds. Rejects at once if the run is stopped |

### Methods

| Call | Body | Returns |
|------|------|---------|
| \`api.get(url, opts?)\` | — | \`Promise<Response<T>>\` |
| \`api.post(url, body, opts?)\` | JSON | \`Promise<Response<T>>\` |
| \`api.put(url, body, opts?)\` | JSON | \`Promise<Response<T>>\` |
| \`api.patch(url, body, opts?)\` | JSON | \`Promise<Response<T>>\` |
| \`api.delete(url, opts?)\` | — | \`Promise<Response<T>>\` |
| \`api.options(url, opts?)\` | — | \`Promise<Response<T>>\` — read \`headers\` / \`status\` |
| \`api.head(url, opts?)\` | — | \`Promise<Response<T>>\` — headers only, no body |
| \`api.sse(url, opts?, onEvent?)\` | — | \`Promise<{ close(), done }>\` |
| \`api.stream(url, body?, opts?, onEvent?)\` | JSON | \`Promise<{ close(), done }>\` — POST (default) an \`event-stream\` reply, rendered live |
| \`api.assert(condition, message?)\` | — | \`void\` — records a pass/fail, never throws |
| \`api.file(accept?)\` | — | \`Promise<File>\` — opens a native file picker |
| \`api.form(fields)\` | — | \`FormData\` — builds a multipart body |

Every verb also exists on \`api.server.*\`, which routes the call through the app's own proxy — reach for it when CORS blocks the browser from calling a host directly. File uploads work there too: the proxy streams the body straight through instead of JSON-encoding it.

### Response

| Field | Type | Notes |
|-------|------|-------|
| \`data\` | \`T\` | Parsed JSON, or the raw text when the body is not JSON |
| \`status\` | \`number\` | HTTP status code |
| \`headers\` | \`Record<string, string>\` | Response headers |
| \`ok\` | \`boolean\` | \`true\` for a 2xx status |

Name the payload with a generic and the rest of the script is checked against it:

\`\`\`ts
type User = { id: number; name: string };

const r = await api.get<User[]>('{{baseUrl}}/users');
console.log(r.data[0].name);
\`\`\`

### Options

| Field | Type | Notes |
|-------|------|-------|
| \`headers\` | \`Record<string, string>\` | Merged over \`Content-Type\` and the auth headers |
| \`auth\` | \`BulkyAuth\` | Per-call credentials — overrides \`env.token\` |

#### auth

| \`type\` | Required | Header sent |
|--------|----------|-------------|
| \`'bearer'\` | \`token\` | \`Authorization: Bearer <token>\` |
| \`'basic'\` | \`username\`, \`password\` | \`Authorization: Basic <base64>\` |
| \`'apikey'\` | \`key\`, \`header?\` | \`<header>: <key>\` — \`header\` defaults to \`X-API-Key\` |

> If \`env.token\` is set, Bearer auth is applied to every call automatically. Pass \`auth\` only to override it.

### File uploads

\`api.file(accept?)\` opens the browser's native file picker and resolves with the chosen \`File\`. \`api.form(fields)\` builds a multipart body from it — pass either straight as the request body:

\`\`\`ts
const picked = await api.file('image/*');
const r = await api.post(
  env.baseUrl + '/upload',
  api.form({ file: picked, caption: 'from Bulky' }),
);
console.log('uploaded:', r.data.url, '| status:', r.status);
\`\`\`

A \`File\`/\`Blob\` also works as the body directly — for a raw (non-multipart) upload:

\`\`\`ts
const picked = await api.file();
await api.post(env.baseUrl + '/upload', picked);
\`\`\`

Neither body is JSON-encoded and neither gets the default \`Content-Type: application/json\` — the browser sets its own (the multipart boundary for \`api.form()\`, the file's type for a bare \`File\`/\`Blob\`). Works through \`api.server.*\` too: the proxy streams the upload to the target rather than wrapping it in JSON.

### Environment variables

| Form | Works in | Example |
|------|----------|---------|
| \`{{name}}\` | URL strings | \`api.get('{{baseUrl}}/users')\` |
| \`env.name\` | Anywhere in the script | \`api.get(env.baseUrl + '/users')\` |

Assigning — \`env.token = r.data.token\` or \`env.set('token', r.data.token)\` — hands the value to later calls in the same run. \`env.get('token')\` reads it back. Bulky lists every changed variable in the **Extracted** panel after the run, to promote into the environment.

\`env\` resolves in layers: a global **Base** bag (every environment inherits it) under the active environment's own vars. A collection's **pre-run / post-run hooks** wrap every run and share this same \`env\` — see the *Pre / post-run hooks* example.

### Assertions

\`expect(actual)\` and \`api.assert(cond, message?)\` record checks without stopping the run. Each result shows on the matching call card (a \`✓\`/\`✗\` badge and a **Tests** tab) and in the run summary.

| Matcher | Passes when |
|---------|-------------|
| \`.toBe(v)\` / \`.toEqual(v)\` | strict / deep equal |
| \`.toBeTruthy()\` / \`.toBeFalsy()\` | truthiness |
| \`.toBeDefined()\` / \`.toBeNull()\` | value is defined / \`null\` |
| \`.toContain(v)\` | string / array / object contains \`v\` |
| \`.toMatch(re)\` | string matches the pattern |
| \`.toBeGreaterThan(n)\` / \`.toBeLessThan(n)\` | numeric compare |
| \`.toHaveProperty(key)\` | object owns \`key\` |
| \`.toHaveStatus(code)\` | \`actual\` or \`actual.status\` equals \`code\` |
| \`.toBeOk()\` | \`actual.ok\` (or \`actual\`) is truthy |

Prefix any matcher with \`.not\` to invert it. \`sleep(ms)\` pauses between checks — handy for polling.

\`\`\`ts
const r = await api.get('{{baseUrl}}/users');
expect(r).toHaveStatus(200);
expect(r).toBeOk();
expect(r.data).not.toContain(null);
api.assert(r.data.length > 0, 'user list is not empty');
\`\`\`

### Runnable example

\`\`\`ts
const users = await api.get(env.baseUrl + '/users');
console.log('users fetched:', users.data.length);

const first = users.data[0];
const posts = await api.get(\`\${env.baseUrl}/posts?userId=\${first.id}\`);
console.log('posts for user', first.id, ':', posts.data.length);
\`\`\``,
    code: DOCS_CODE,
  },
  {
    label: "Simple GET",
    method: "GET",
    markdown: `## Simple GET

Fetch a collection and log its status and size — the smallest useful script, and the starting point for any read-only workflow.

\`\`\`ts
const r = await api.get(env.baseUrl + '/users');
console.log('status:', r.status, '| count:', r.data.length);
\`\`\`

| Expression | Reads |
|------------|-------|
| \`r.status\` | HTTP status code |
| \`r.data\` | Parsed response body |
| \`r.ok\` | \`true\` for a 2xx status |

**Typed variant** — name the payload and the editor checks every use of it:

\`\`\`ts
type User = { id: number; name: string };

const r = await api.get<User[]>(env.baseUrl + '/users');
console.log(r.data.map((u) => u.name));
\`\`\``,
    code: `const r = await api.get(env.baseUrl + '/users');
console.log('status:', r.status, '| count:', r.data.length);`,
  },
  {
    label: "POST with body",
    method: "POST",
    markdown: `## POST with body

Create a resource by sending a JSON body. Bulky serializes the object and sets \`Content-Type: application/json\` for you; the response carries the server-assigned \`id\` on \`r.data.id\`.

| Argument | Type | Notes |
|----------|------|-------|
| \`url\` | \`string\` | \`{{var}}\` is resolved from the active environment |
| \`body\` | \`unknown\` | Serialized as JSON — omit it for GET-like verbs |
| \`opts\` | \`BulkyCallOpts\` | Optional \`headers\` and \`auth\` |

\`\`\`ts
const r = await api.post(env.baseUrl + '/posts', {
  title: 'Hello Bulky',
  body: 'My first POST',
  userId: 1,
});
console.log('created id:', r.data.id, '| status:', r.status);
\`\`\``,
    code: `const r = await api.post(env.baseUrl + '/posts', {
  title: 'Hello Bulky',
  body: 'My first POST',
  userId: 1,
});
console.log('created id:', r.data.id, '| status:', r.status);`,
  },
  {
    label: "PUT update",
    method: "PUT",
    markdown: `## PUT update

Replace an existing resource in full.

| Verb | Sends | Use when |
|------|-------|----------|
| \`PUT\` | The whole object | Every field is known and being replaced |
| \`PATCH\` | Only changed fields | Updating part of a resource |

\`\`\`ts
const r = await api.put(env.baseUrl + '/posts/1', {
  title: 'Updated title',
  body: 'Updated body',
  userId: 1,
});
console.log('updated:', r.data.title, '| status:', r.status);
\`\`\`

> A \`PUT\` that omits a field usually clears it server-side. Switch to \`api.patch\` when that is not what you want.`,
    code: `const r = await api.put(env.baseUrl + '/posts/1', {
  title: 'Updated title',
  body: 'Updated body',
  userId: 1,
});
console.log('updated:', r.data.title, '| status:', r.status);`,
  },
  {
    label: "Chain: GET → POST",
    method: "GET",
    markdown: `## Chain: GET → POST

Four calls in one run, each feeding the next. Every response stays in scope, so an id from step 1 is just a variable by step 3.

| Step | Call | Feeds on |
|------|------|----------|
| 1 | \`api.get('/users')\` | — |
| 2 | \`api.get('/posts?userId=…')\` | The first user's \`id\` |
| 3 | \`api.post('/posts', …)\` | The first user's \`id\` |
| 4 | \`api.put('/posts/:id', …)\` | The \`id\` returned by step 3 |

\`\`\`ts
// 1. Fetch all users
const users = await api.get(env.baseUrl + '/users');
console.log('Fetched', users.data.length, 'users');

// 2. Get posts for the first user
const firstUser = users.data[0];
const posts = await api.get(\`\${env.baseUrl}/posts?userId=\${firstUser.id}\`);

// 3. Create a new post
const created = await api.post(env.baseUrl + '/posts', {
  title: 'Bulky API Automation',
  body: 'Generated via chained script',
  userId: firstUser.id,
});

// 4. Update the created post
const updated = await api.put(\`\${env.baseUrl}/posts/\${created.data.id}\`, {
  title: 'Updated by Bulky API',
  body: 'This post was updated in a single script run',
  userId: 1,
});

console.log('Done! Ran 4 chained API calls.');
\`\`\`

> Run in **step mode** to pause between calls and inspect each response before the next one fires.`,
    code: SAMPLE_CODE,
  },
  {
    label: "Assertions",
    method: "GET",
    markdown: `## Assertions

Turn a request into a test. \`expect(...)\` and \`api.assert(...)\` record pass/fail without stopping the run, so one script can check many things and report them all.

| Where results show |
|--------------------|
| A \`✓\`/\`✗\` badge and a **Tests** tab on the matching call card |
| The **Tests** strip under the call list — run-level \`✓ N  ✗ M\` |
| The Console — one line per check |

\`\`\`ts
const list = await api.get(env.baseUrl + '/users');
expect(list).toHaveStatus(200);
expect(list).toBeOk();
expect(list.data.length).toBeGreaterThan(0);

const first = list.data[0];
expect(first).toHaveProperty('id');
expect(first.name).not.toBe('');

const one = await api.get(\`\${env.baseUrl}/users/\${first.id}\`);
expect(one.data.id).toBe(first.id);
api.assert(one.data.email.includes('@'), 'email looks valid');
\`\`\`

> Prefix any matcher with \`.not\` to invert it. \`sleep(ms)\` waits between checks — useful when polling for a state change.`,
    code: `const list = await api.get(env.baseUrl + '/users');
expect(list).toHaveStatus(200);
expect(list).toBeOk();
expect(list.data.length).toBeGreaterThan(0);

const first = list.data[0];
expect(first).toHaveProperty('id');
expect(first.name).not.toBe('');

const one = await api.get(\`\${env.baseUrl}/users/\${first.id}\`);
expect(one.data.id).toBe(first.id);
api.assert(one.data.email.includes('@'), 'email looks valid');`,
  },
  {
    label: "File upload",
    method: "POST",
    markdown: `## File upload

\`api.file()\` opens the browser's native picker; \`api.form()\` wraps the picked file (plus any other fields) into a multipart body. Neither gets JSON-encoded — the browser sets its own \`Content-Type\`, boundary included.

\`\`\`ts
const picked = await api.file('image/*');
const r = await api.post(
  env.baseUrl + '/upload',
  api.form({ file: picked, caption: 'from Bulky' }),
);
console.log('uploaded:', r.data.url, '| status:', r.status);
\`\`\`

| Call | Body it builds |
|------|----------------|
| \`api.form({ file: picked, note: 'x' })\` | Multipart — \`picked\` becomes a file field, \`note\` a text field |
| \`picked\` passed directly | Raw upload — just the file's bytes, its own type as \`Content-Type\` |

> Works through \`api.server.*\` too — the proxy streams the upload to the target instead of wrapping it in JSON. The Payload tab lists field names and file sizes rather than a JSON dump; Copy-as-cURL emits \`-F\` flags.`,
    code: `const picked = await api.file('image/*');
const r = await api.post(
  env.baseUrl + '/upload',
  api.form({ file: picked, caption: 'from Bulky' }),
);
console.log('uploaded:', r.data.url, '| status:', r.status);`,
  },
  {
    label: "Bearer auth",
    method: "GET",
    markdown: `## Bearer auth

Send a Bearer token for one call, taken here from \`env.token\`.

| Field | Type | Notes |
|-------|------|-------|
| \`type\` | \`'bearer'\` | Selects the scheme |
| \`token\` | \`string\` | Sent as \`Authorization: Bearer <token>\` |

\`\`\`ts
const r = await api.get('https://httpbin.org/bearer', {
  auth: { type: 'bearer', token: env.token },
});
console.log('authenticated:', r.ok, '| status:', r.status);
\`\`\`

> **Tip:** with \`env.token\` set, every call already uses Bearer — pass \`auth\` only to override it or to send a different token.`,
    code: `const r = await api.get('https://httpbin.org/bearer', {
  auth: { type: 'bearer', token: env.token },
});
console.log('authenticated:', r.ok, '| status:', r.status);`,
  },
  {
    label: "Basic auth",
    method: "GET",
    markdown: `## Basic auth

Authenticate with a username and password. Bulky base64-encodes the pair into the \`Authorization: Basic …\` header.

| Field | Type | Notes |
|-------|------|-------|
| \`type\` | \`'basic'\` | Selects the scheme |
| \`username\` | \`string\` | Encoded as \`username:password\` |
| \`password\` | \`string\` | Both are required — one alone is ignored |

\`\`\`ts
const r = await api.get('https://httpbin.org/basic-auth/user/pass', {
  auth: { type: 'basic', username: 'user', password: 'pass' },
});
console.log('auth:', r.ok, '| status:', r.status);
\`\`\``,
    code: `const r = await api.get('https://httpbin.org/basic-auth/user/pass', {
  auth: { type: 'basic', username: 'user', password: 'pass' },
});
console.log('auth:', r.ok, '| status:', r.status);`,
  },
  {
    label: "API Key auth",
    method: "GET",
    markdown: `## API Key auth

Send an API key in a request header of your choosing.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| \`type\` | \`'apikey'\` | — | Selects the scheme |
| \`key\` | \`string\` | — | The value sent |
| \`header\` | \`string\` | \`X-API-Key\` | Header the key is sent under |

\`\`\`ts
const r = await api.get('https://httpbin.org/headers', {
  auth: { type: 'apikey', key: env.apiKey, header: 'X-API-Key' },
});
console.log('status:', r.status);
\`\`\`

> Keep the key in an environment variable rather than in the script — the environment travels with the collection, the script gets shared.`,
    code: `const r = await api.get('https://httpbin.org/headers', {
  auth: { type: 'apikey', key: env.apiKey, header: 'X-API-Key' },
});
console.log('status:', r.status);`,
  },
  {
    label: "Custom headers",
    method: "GET",
    markdown: `## Custom headers

Attach arbitrary request headers through the \`headers\` option.

| Source | Wins over | Notes |
|--------|-----------|-------|
| \`Content-Type: application/json\` | — | Always set first |
| Auth headers | \`Content-Type\` | From \`opts.auth\` or \`env.token\` |
| \`opts.headers\` | Both of the above | Last writer wins, so it can replace either |

\`\`\`ts
const r = await api.get('https://httpbin.org/headers', {
  headers: {
    'X-Bulky': 'true',
    'X-Request-Id': crypto.randomUUID(),
  },
});
console.log('sent headers:', r.data.headers);
\`\`\``,
    code: `const r = await api.get('https://httpbin.org/headers', {
  headers: {
    'X-Bulky': 'true',
    'X-Request-Id': crypto.randomUUID(),
  },
});
console.log('sent headers:', r.data.headers);`,
  },
  {
    label: "Error handling",
    method: "GET",
    markdown: `## Error handling

A failed *response* and a failed *request* surface differently — one is a value to check, the other an exception to catch.

| Case | Surfaces as | Detect with |
|------|-------------|-------------|
| 4xx / 5xx | A normal response | \`r.ok === false\`, \`r.status\` |
| Network failure | Throws | \`try\` / \`catch\` |
| Call timeout | Throws, run stops | \`try\` / \`catch\` |
| Stopped by you | Throws \`Script aborted\` | Not caught — the run ends |

\`\`\`ts
try {
  const r = await api.get(env.baseUrl + '/nonexistent-route');
  if (!r.ok) {
    console.warn('non-2xx response:', r.status);
  } else {
    console.log('ok:', r.status);
  }
} catch (err) {
  console.error('network error:', (err as Error).message);
}
\`\`\`

> Without a \`try\` / \`catch\`, the first thrown error stops the whole script — later calls never fire.`,
    code: `try {
  const r = await api.get(env.baseUrl + '/nonexistent-route');
  if (!r.ok) {
    console.warn('non-2xx response:', r.status);
  } else {
    console.log('ok:', r.status);
  }
} catch (err) {
  console.error('network error:', err.message);
}`,
  },
  {
    label: "Pre / post-run hooks",
    method: "DOCS",
    markdown: `## Pre / post-run hooks

Collection-level setup and teardown. Open a collection's **run hooks** control (the workflow icon on its row) and fill either field:

- **Pre-run** runs once *before* the request script — on every run of every request in the collection.
- **Post-run** runs once *after* it.

All three run in a single pass and share \`api\`, \`console\`, \`sleep\`, \`expect\` and the same \`env\`. Hook calls appear as ordinary cards, in order.

### Passing data forward

Local variables do **not** cross between the segments — hand values over through the environment:

| In the hook | Everywhere after it |
|-------------|---------------------|
| \`env.set('token', v)\` | \`env.token\` · \`env.get('token')\` · \`{{token}}\` in a URL |

A \`token\` set in the pre-run lands on \`env.token\`, so Bearer auth is then applied to every later call automatically.

### Pre-run — authenticate once

\`\`\`ts
const r = await api.post(env.baseUrl + '/login', {
  username: env.user,
  password: env.pass,
});
env.set('token', r.data.token);
\`\`\`

### Pre-run — seed a fixture

\`\`\`ts
const seed = await api.post(env.baseUrl + '/posts', { title: 'fixture', userId: 1 });
env.set('seedId', String(seed.data.id));
\`\`\`

### The request script — just uses it

\`\`\`ts
const r = await api.get('{{baseUrl}}/posts/{{seedId}}');
console.log('status:', r.status, '| title:', r.data.title);
\`\`\`

### Post-run — clean up

\`\`\`ts
await api.delete(env.baseUrl + '/posts/' + env.get('seedId'));
console.log('fixture removed');
\`\`\`

> A \`return\` or an uncaught error in the request script skips the post-run — it is best-effort teardown, not a \`finally\`. A blank hook contributes nothing.`,
    code: `// Loads the REQUEST-SCRIPT half of the hooks example.
// Put the other halves on the collection (run hooks control):
//
//   PRE-RUN
//     const a = await api.post(env.baseUrl + '/login', { username: env.user, password: env.pass });
//     env.set('token', a.data.token);
//     const seed = await api.post(env.baseUrl + '/posts', { title: 'fixture', userId: 1 });
//     env.set('seedId', String(seed.data.id));
//
//   POST-RUN
//     await api.delete(env.baseUrl + '/posts/' + env.get('seedId'));

const r = await api.get('{{baseUrl}}/posts/{{seedId}}');
console.log('status:', r.status, '| title:', r.data.title);
console.log('authenticated:', env.get('token') ? 'yes' : 'no');`,
  },
  {
    label: "SSE stream",
    method: "SSE",
    markdown: `## SSE stream

Open a Server-Sent Events connection. The callback fires per event; the returned controller closes the stream.

| Argument | Type | Notes |
|----------|------|-------|
| \`url\` | \`string\` | \`{{var}}\` is resolved from the active environment |
| \`opts\` | \`BulkyCallOpts\` | Optional \`headers\` and \`auth\` |
| \`onEvent\` | \`(e: BulkySseEvent) => void\` | Called for every event received |

\`\`\`ts
const stream = await api.sse(env.baseUrl + '/events', {}, (event) => {
  console.log('event:', event.type, '|', event.data);
});

// Close after 10 seconds (remove to stream indefinitely)
setTimeout(() => {
  stream.close();
  console.log('stream closed');
}, 10000);
\`\`\`

#### Event shape

| Field | Type | Notes |
|-------|------|-------|
| \`type\` | \`string\` | Defaults to \`"message"\` |
| \`data\` | \`string\` | Raw event data |
| \`id\` | \`string?\` | Optional event ID |

> Events also stream into the response panel as they arrive — the callback is for reacting to them, not for reading them. Need to **send** a body to open the stream (an LLM chat/completions call, say)? See the **LLM stream** example — \`api.stream\`/\`api.server.stream\` work the same way, plus \`opts.method\`/\`opts.body\`.`,
    code: `// Connect to an SSE endpoint and receive events in real-time.
// api.sse() returns a controller with .close() to stop early.

const stream = await api.sse(env.baseUrl + '/events', {}, (event) => {
  console.log('event:', event.type, '|', event.data);
});

// Close after 10 seconds (remove this to stream indefinitely)
setTimeout(() => {
  stream.close();
  console.log('stream closed');
}, 10000);`,
  },
  {
    label: "LLM stream",
    method: "SSE",
    markdown: `## LLM stream

\`api.stream(url, body, opts?, onEvent?)\` opens an \`event-stream\` reply with a POST body — the shape most LLM chat/completions endpoints use — and renders each token live instead of waiting for the whole reply. \`api.sse\` is GET-only with no body; this is its POST counterpart.

Use \`api.server.stream\` instead when the host blocks browser CORS (most hosted LLM APIs do) — it routes through the app's own proxy, same as \`api.server.*\` does for the other verbs.

\`\`\`ts
const stream = await api.server.stream(
  env.baseUrl + '/chat/completions',
  { model: 'gpt-4o-mini', stream: true, messages: [{ role: 'user', content: 'Say hi in 5 words.' }] },
  { headers: { Authorization: \`Bearer \${env.apiKey}\` } },
  (event) => console.log('chunk:', event.data),
);

// Resolves once the stream ends — every event received, plus the
// concatenated raw \`data:\` text (handy for a plain-text token stream;
// a JSON-per-line format like OpenAI's still needs parsing per event).
const { events, text } = await stream.done;
console.log(events.length, 'chunks —', text.length, 'chars total');
\`\`\`

> The response panel's Response tab has an EVENTS / TEXT toggle for a stream call — TEXT concatenates the raw \`data:\` payloads, which reads as running prose for a plain-text token stream.`,
    code: `// POST a chat/completions-style body and stream the reply live.
// api.server.stream routes through the app's proxy (avoids CORS on
// hosted LLM APIs); api.stream does the same call directly.

const stream = await api.server.stream(
  env.baseUrl + '/chat/completions',
  {
    model: 'gpt-4o-mini',
    stream: true,
    messages: [{ role: 'user', content: 'Say hi in 5 words.' }],
  },
  { headers: { Authorization: \`Bearer \${env.apiKey}\` } },
  (event) => console.log('chunk:', event.data),
);

const { events, text } = await stream.done;
console.log(events.length, 'chunks —', text.length, 'chars total');`,
  },
];

export const INITIAL_ENVIRONMENTS: Environment[] = [];
