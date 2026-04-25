# Bulky API — Standard Operating Procedure (SOP)

**Version:** 1.0.0  
**Author:** WAUX Studio  
**Last Updated:** April 25, 2026

---

## 1. Overview

Bulky API is a JavaScript-based API automation client. It allows developers and QA engineers to write chained API scripts, auto-build call previews, and inspect live responses — all from a single interface.

---

## 2. Interface Layout

| Panel | Purpose |
|---|---|
| **Left Sidebar** | Test Cases, Environments, Variables, File actions |
| **Middle Editor** | Write and edit automation scripts in JavaScript |
| **Right Panel** | Auto-built API call cards; live status and response details |

---

## 3. Writing a Script

### 3.1 Available API Methods

```js
await api.get(url, opts?)
await api.post(url, body, opts?)
await api.put(url, body, opts?)
await api.patch(url, body, opts?)
await api.delete(url, opts?)
```

### 3.2 Using Environment Variables

```js
// Reference env vars with env.key
const res = await api.get(env.baseUrl + '/users');
```

### 3.3 Chaining Calls

```js
const users = await api.get(env.baseUrl + '/users');
const posts = await api.get(`${env.baseUrl}/posts?userId=${users.data[0].id}`);
await api.post(env.baseUrl + '/posts', {
  title: 'New Post',
  userId: users.data[0].id
});
```

### 3.4 Authentication

```js
// Bearer token
await api.get(url, { auth: { type: 'bearer', token: 'my-token' } });

// Basic auth
await api.get(url, { auth: { type: 'basic', username: 'u', password: 'p' } });

// API Key header
await api.get(url, { auth: { type: 'apikey', header: 'X-API-Key', key: 'abc' } });
```

### 3.5 Console Logging

```js
console.log('Message');
console.warn('Warning');
console.error('Error');
```

---

## 4. Running a Script

1. Write or load a script in the middle editor
2. The right panel automatically builds call cards from the script (idle state)
3. Press **Run Script** (or `⌘ + Enter`) to execute
4. Each call card updates live: `idle → pending → 200 / error`
5. Click any card to expand and inspect results

---

## 5. Inspecting Results

Each call card expands to show 5 tabs:

| Tab | Shows |
|---|---|
| **Response** | JSON tree viewer (Pretty / Raw toggle) |
| **Headers** | Response headers as key-value pairs |
| **Auth** | Auth method used, masked token/key |
| **Payload** | Request headers and request body sent |
| **Status** | HTTP status code, duration, timestamp, host |

---

## 6. Managing Test Cases

- All test cases are listed as flat files in the sidebar (**Test Cases** tab)
- Click a file to load its script into the editor
- Use `+` to create a new test case
- Method badge (`GET` / `POST` / etc.) is shown per file

---

## 7. Environments & Variables

### 7.1 Switching Environments

1. Open **Environments** tab in sidebar
2. Click an environment to activate it (dot turns cyan)
3. All `env.*` references in scripts resolve to that environment's values

### 7.2 Viewing Variables

Open **Variables** tab to see all key-value pairs for the active environment. Sensitive values (`token`, `key`) are masked with `••••••••`.

### 7.3 Using Variables in Scripts

```js
// Syntax: env.variableName
env.baseUrl   // → https://jsonplaceholder.typicode.com
env.token     // → dev-token-abc123
env.apiKey    // → dev-key-xyz789
```

---

## 8. File Actions

| Action | Description |
|---|---|
| **Save Script** | Export current editor content as `.js` |
| **Import Script** | Load a `.js` automation file |
| **Export Collection** | Save all test cases as JSON |
| **Import from cURL** | Paste a curl command to auto-generate a script |
| **Recent** | Quick-access recently used files |

---

## 9. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘ + Enter` | Run script |
| `Tab` | Indent 2 spaces in editor |
| Click card | Expand / collapse response detail |

---

## 10. Theming & Layout

Access via the **Tweaks** toggle in the toolbar:

| Option | Values |
|---|---|
| **Color Theme** | Midnight (deep navy), Ocean (blue-teal) |
| **Layout** | Balanced (equal columns), Editor Focus (wider editor) |

---

## 11. Error Handling

| Scenario | Behavior |
|---|---|
| Network error | Card shows `ERR` badge, error message in console |
| HTTP 4xx / 5xx | Card shows status code in red, expandable detail |
| Script syntax error | Console shows `[error] Script error: ...` |
| Unresolved env var | URL shows `[varName]` placeholder |

---

## 12. Best Practices

- Always set `env.baseUrl` before running scripts against an API
- Use `console.log()` to debug intermediate values between chained calls
- Keep test cases focused — one scenario per file
- Name test cases descriptively: `create-user-and-verify.js`
- Use Bearer (env) auth by setting `env.token` — no need to repeat in every call
