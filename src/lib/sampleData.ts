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
    id: "c1",
    name: "JSONPlaceholder",
    open: true,
    items: [
      {
        id: "i1",
        name: "Get All Users",
        method: "GET",
        code: `const r = await api.get(env.baseUrl + '/users');\nconsole.log('Users:', r.data.length);`,
      },
      {
        id: "i2",
        name: "Get All Posts",
        method: "GET",
        code: `const r = await api.get(env.baseUrl + '/posts');\nconsole.log('Posts:', r.data.length);`,
      },
      {
        id: "i3",
        name: "Create Post",
        method: "POST",
        code: `const r = await api.post(env.baseUrl + '/posts', {\n  title: 'Hello from Bulky',\n  body: 'Testing POST',\n  userId: 1\n});`,
      },
      {
        id: "i4",
        name: "Chain: Users → Posts",
        method: "GET",
        code: SAMPLE_CODE,
      },
    ],
  },
  {
    id: "c2",
    name: "HTTPBin",
    open: false,
    items: [
      {
        id: "i5",
        name: "Echo GET",
        method: "GET",
        code: `const r = await api.get('https://httpbin.org/get', { headers: { 'X-Bulky': 'true' } });`,
      },
      {
        id: "i6",
        name: "Echo POST",
        method: "POST",
        code: `const r = await api.post('https://httpbin.org/post', { tool: 'bulky-api', version: 1 });`,
      },
      {
        id: "i7",
        name: "Bearer Auth",
        method: "GET",
        code: `const r = await api.get('https://httpbin.org/bearer', {\n  auth: { type: 'bearer', token: env.token }\n});`,
      },
    ],
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

export type ExampleScript = { label: string; method: string; code: string };

export const EXAMPLE_SCRIPTS: ExampleScript[] = [
  { label: "API Reference", method: "DOCS", code: DOCS_CODE },
  {
    label: "Simple GET",
    method: "GET",
    code: `const r = await api.get(env.baseUrl + '/users');
console.log('status:', r.status, '| count:', r.data.length);`,
  },
  {
    label: "POST with body",
    method: "POST",
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
    code: `const r = await api.put(env.baseUrl + '/posts/1', {
  title: 'Updated title',
  body: 'Updated body',
  userId: 1,
});
console.log('updated:', r.data.title, '| status:', r.status);`,
  },
  { label: "Chain: GET → POST", method: "GET", code: SAMPLE_CODE },
  {
    label: "Bearer auth",
    method: "GET",
    code: `const r = await api.get('https://httpbin.org/bearer', {
  auth: { type: 'bearer', token: env.token },
});
console.log('authenticated:', r.ok, '| status:', r.status);`,
  },
  {
    label: "Basic auth",
    method: "GET",
    code: `const r = await api.get('https://httpbin.org/basic-auth/user/pass', {
  auth: { type: 'basic', username: 'user', password: 'pass' },
});
console.log('auth:', r.ok, '| status:', r.status);`,
  },
  {
    label: "API Key auth",
    method: "GET",
    code: `const r = await api.get('https://httpbin.org/headers', {
  auth: { type: 'apikey', key: env.apiKey, header: 'X-API-Key' },
});
console.log('status:', r.status);`,
  },
  {
    label: "Custom headers",
    method: "GET",
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
];

export const INITIAL_ENVIRONMENTS: Environment[] = [];
