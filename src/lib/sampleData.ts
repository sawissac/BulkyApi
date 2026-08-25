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

Full reference for all \`api.*\` methods, auth options, environment variables, and the console.

### Globals

| Name | Description |
|------|-------------|
| \`api\` | HTTP client — \`get\`, \`post\`, \`put\`, \`patch\`, \`delete\`, \`options\`, \`sse\` |
| \`env\` | Active environment variables. Writable — \`env.x = val\` is available to later calls |
| \`console\` | \`.log\` / \`.warn\` / \`.error\` / \`.info\` — output appears in the Console panel |

### api methods

\`\`\`js
api.get(url, opts?)
api.post(url, body, opts?)
api.put(url, body, opts?)
api.patch(url, body, opts?)
api.delete(url, opts?)
api.options(url, opts?)
// Returns: { data, status, headers, ok }

api.sse(url, opts?, onEvent?)
// Returns: Promise<{ close() }>
// onEvent({ type, data, id }) fires for each SSE event
\`\`\`

### opts

\`\`\`js
{
  headers: { 'X-Custom': 'value' },
  auth: {
    type: 'bearer',  token: 'abc',
    // or
    type: 'basic',   username: 'u',  password: 'p',
    // or
    type: 'apikey',  key: 'k',       header: 'X-API-Key',
  }
}
\`\`\`

> If \`env.token\` is set, Bearer auth is applied automatically. Pass \`auth\` in opts to override per-call.

### env interpolation

Use \`{{varName}}\` directly in URL strings:

\`\`\`js
api.get('{{baseUrl}}/users')
\`\`\`

### Runnable example

\`\`\`js
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

Fetch a list of resources and log the response status and count. Good starting point for any read-only workflow.

\`\`\`js
const r = await api.get(env.baseUrl + '/users');
console.log('status:', r.status, '| count:', r.data.length);
\`\`\``,
    code: `const r = await api.get(env.baseUrl + '/users');
console.log('status:', r.status, '| count:', r.data.length);`,
  },
  {
    label: "POST with body",
    method: "POST",
    markdown: `## POST with body

Create a new resource by sending a JSON body. The response includes the server-assigned \`id\`.

\`\`\`js
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

Replace an existing resource in full. Use this when the full object must be sent — partial updates should use \`PATCH\` instead.

\`\`\`js
const r = await api.put(env.baseUrl + '/posts/1', {
  title: 'Updated title',
  body: 'Updated body',
  userId: 1,
});
console.log('updated:', r.data.title, '| status:', r.status);
\`\`\``,
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

Multi-step script — fetches users, reads posts for the first user, creates a new post, then updates it. Demonstrates chaining responses across calls.

\`\`\`js
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
\`\`\``,
    code: SAMPLE_CODE,
  },
  {
    label: "Bearer auth",
    method: "GET",
    markdown: `## Bearer auth

Pass a Bearer token from \`env.token\` via the \`auth\` option. Overrides the automatic env-token injection for this call.

\`\`\`js
const r = await api.get('https://httpbin.org/bearer', {
  auth: { type: 'bearer', token: env.token },
});
console.log('authenticated:', r.ok, '| status:', r.status);
\`\`\`

> **Tip:** If \`env.token\` is set, all calls use Bearer automatically — you only need explicit \`auth\` to override or use a different token.`,
    code: `const r = await api.get('https://httpbin.org/bearer', {
  auth: { type: 'bearer', token: env.token },
});
console.log('authenticated:', r.ok, '| status:', r.status);`,
  },
  {
    label: "Basic auth",
    method: "GET",
    markdown: `## Basic auth

Authenticate with a username and password. Bulky base64-encodes them into the \`Authorization: Basic …\` header automatically.

\`\`\`js
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

Send an API key in a custom request header. The \`header\` field defaults to \`X-API-Key\` if omitted.

\`\`\`js
const r = await api.get('https://httpbin.org/headers', {
  auth: { type: 'apikey', key: env.apiKey, header: 'X-API-Key' },
});
console.log('status:', r.status);
\`\`\``,
    code: `const r = await api.get('https://httpbin.org/headers', {
  auth: { type: 'apikey', key: env.apiKey, header: 'X-API-Key' },
});
console.log('status:', r.status);`,
  },
  {
    label: "Custom headers",
    method: "GET",
    markdown: `## Custom headers

Attach arbitrary request headers via the \`headers\` option. These are merged with auth headers and \`Content-Type\`.

\`\`\`js
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

Distinguish non-2xx responses (where \`r.ok\` is \`false\`) from hard network errors. Wrap calls in \`try/catch\` to prevent the whole script from stopping on failure.

\`\`\`js
try {
  const r = await api.get(env.baseUrl + '/nonexistent-route');
  if (!r.ok) {
    console.warn('non-2xx response:', r.status);
  } else {
    console.log('ok:', r.status);
  }
} catch (err) {
  console.error('network error:', err.message);
}
\`\`\`

| Case | Behaviour |
|------|-----------|
| 4xx / 5xx | \`r.ok = false\`, no throw |
| Network failure / timeout | throws — caught by \`catch\` |`,
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
    label: "SSE stream",
    method: "SSE",
    markdown: `## SSE stream

Open a Server-Sent Events connection. Each event fires the callback with \`{ type, data, id }\`. Call \`.close()\` to disconnect early.

\`\`\`js
const stream = await api.sse(env.baseUrl + '/events', {}, (event) => {
  console.log('event:', event.type, '|', event.data);
});

// Close after 10 seconds (remove to stream indefinitely)
setTimeout(() => {
  stream.close();
  console.log('stream closed');
}, 10000);
\`\`\`

**Event shape**

| Field | Type | Notes |
|-------|------|-------|
| \`type\` | string | Defaults to \`"message"\` |
| \`data\` | string | Raw event data |
| \`id\` | string? | Optional event ID |`,
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
];

export const INITIAL_ENVIRONMENTS: Environment[] = [];
