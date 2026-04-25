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
    id: 'c1',
    name: 'JSONPlaceholder',
    open: true,
    items: [
      {
        id: 'i1',
        name: 'Get All Users',
        method: 'GET',
        code: `const r = await api.get(env.baseUrl + '/users');\nconsole.log('Users:', r.data.length);`,
      },
      {
        id: 'i2',
        name: 'Get All Posts',
        method: 'GET',
        code: `const r = await api.get(env.baseUrl + '/posts');\nconsole.log('Posts:', r.data.length);`,
      },
      {
        id: 'i3',
        name: 'Create Post',
        method: 'POST',
        code: `const r = await api.post(env.baseUrl + '/posts', {\n  title: 'Hello from Bulky',\n  body: 'Testing POST',\n  userId: 1\n});`,
      },
      {
        id: 'i4',
        name: 'Chain: Users → Posts',
        method: 'GET',
        code: SAMPLE_CODE,
      },
    ],
  },
  {
    id: 'c2',
    name: 'HTTPBin',
    open: false,
    items: [
      {
        id: 'i5',
        name: 'Echo GET',
        method: 'GET',
        code: `const r = await api.get('https://httpbin.org/get', { headers: { 'X-Bulky': 'true' } });`,
      },
      {
        id: 'i6',
        name: 'Echo POST',
        method: 'POST',
        code: `const r = await api.post('https://httpbin.org/post', { tool: 'bulky-api', version: 1 });`,
      },
      {
        id: 'i7',
        name: 'Bearer Auth',
        method: 'GET',
        code: `const r = await api.get('https://httpbin.org/bearer', {\n  auth: { type: 'bearer', token: env.token }\n});`,
      },
    ],
  },
];

export const INITIAL_ENVIRONMENTS: Environment[] = [
  {
    id: 'dev',
    name: 'Development',
    vars: {
      baseUrl: 'https://jsonplaceholder.typicode.com',
      token: 'dev-token-abc123',
      apiKey: 'dev-key-xyz789',
    },
  },
  {
    id: 'staging',
    name: 'Staging',
    vars: {
      baseUrl: 'https://staging.example.com',
      token: 'staging-token-def456',
      apiKey: 'staging-key-uvw',
    },
  },
];
