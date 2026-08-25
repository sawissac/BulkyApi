# Bulky API

JavaScript-based API automation client. Write chained API scripts in JS, watch live call cards build automatically, inspect responses — all in one window.

Built with Next.js 16, React 19, Redux Toolkit, Monaco editor, Tailwind v4. Works as an installable PWA.

## Features

- **Script-driven**: write JS using `api.get/post/put/patch/delete`. Calls auto-detect into right-pane cards.
- **Live execution**: `⌘+Enter` runs script. Cards transition `idle → pending → 200 / err`.
- **Step mode**: pause between calls, advance one at a time.
- **Environments + variables**: switchable env presets, `env.*` references resolve at run time. Sensitive keys masked in UI.
- **Auth helpers**: bearer / basic / API key shortcuts in call options.
- **Response inspection**: 5 tabs per card (Response, Headers, Auth, Payload, Status). Pretty/raw JSON toggle.
- **Test cases**: flat-file collection in sidebar. One scenario per file.
- **cURL import**: paste curl, auto-generate script.
- **SSE support**: streaming responses captured per-event.
- **Abort + timeout**: stop running scripts, configurable per-call timeout.
- **Themes**: Midnight, Ocean, Light, Purple, Green, Rose, Amber, Slate.
- **Layouts**: Balanced, Editor Focus, Response Focus.
- **Fullscreen + PWA**: installable, offline shell cache, standalone mode.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind v4, Radix UI, shadcn |
| State | Redux Toolkit, react-redux |
| Editor | Monaco (`@monaco-editor/react`) |
| Persistence | localforage |
| Layout | react-resizable-panels v4 |
| Icons | lucide-react |

## Getting started

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>.

```bash
pnpm build
pnpm start    # production server (service worker only registers here)
pnpm lint
```

## Project layout

```
src/
├─ app/
│  ├─ BulkyApp.tsx          # top-level shell: top bar + 3-pane layout
│  ├─ layout.tsx            # metadata, viewport, PWA icons
│  ├─ manifest.ts           # /manifest.webmanifest route
│  ├─ providers.tsx         # Redux + hydration + service worker register
│  └─ api/proxy/            # CORS-bypass fetch proxy (30s timeout)
├─ features/
│  ├─ sidebar/              # Tests / Envs / Vars / File panes
│  ├─ code-editor/          # Monaco wrapper + run/step/stop toolbar
│  ├─ response-panel/       # Call cards, waterfall, docs, console
│  └─ tweaks/               # Theme + layout + timeout panel
├─ hooks/
│  ├─ useScriptRunner.ts    # run/next/stop with AbortController
│  ├─ useFullscreen.ts      # Fullscreen API toggle
│  └─ useServiceWorker.ts   # registers /sw.js in production
├─ lib/
│  ├─ scriptRunner.ts       # makeCall / makeSseCall / auth headers
│  ├─ scriptAnalyzer.ts     # extracts api.* calls without executing
│  ├─ curlParser.ts         # curl → script
│  ├─ persist.ts            # localforage save/load (50KB cap)
│  └─ themes.ts             # color palettes
├─ store/                   # Redux slices: ui, editor, runner, environment, collections
├─ components/              # ErrorBoundary, shadcn primitives
└─ prompts/                 # script examples / docs
public/
├─ favicon.svg              # main icon (also used in top bar)
├─ logo.svg                 # full lockup (mark + wordmark)
├─ logo-mark.svg            # square mark
├─ manifest.webmanifest     # served by app/manifest.ts
└─ sw.js                    # service worker (cache shell + nav fallback)
```

## API surface (in scripts)

```js
await api.get(url, opts?)
await api.post(url, body, opts?)
await api.put(url, body, opts?)
await api.patch(url, body, opts?)
await api.delete(url, opts?)

// auth
await api.get(url, { auth: { type: 'bearer',  token: env.token } });
await api.get(url, { auth: { type: 'basic',   username: 'u', password: 'p' } });
await api.get(url, { auth: { type: 'apikey',  header: 'X-API-Key', key: env.apiKey } });

// env
env.baseUrl   // resolves at run time
env.token     // masked in UI

// console (visible in console panel)
console.log('msg');
console.warn('msg');
console.error('msg');
```

## Collections as JSON

Collections are portable JSON, so one can be hand-authored and imported.

Two importers exist and they accept different shapes:

| Control | Accepts |
|---|---|
| Collections pane → **Import collection** | one collection object, or an array of them |
| File pane → **Import collection** | the above, plus `{ "collections": [...] }` and a legacy top-level `environments` |

File pane → **Export collection** writes the wrapped `{ "collections": [...] }`
form, so re-import that file through the *file* pane, not the collections dialog.
Ids are reassigned on import, so ids in a hand-written file are placeholders.

```jsonc
[
  {
    "id": "placeholder",
    "name": "Profile Service (dev)",
    "open": true,
    "envIdx": 0,
    "environments": [
      { "id": "placeholder", "name": "dev", "vars": { "baseUrl": "https://…", "token": "" } }
    ],
    "items": [
      { "id": "placeholder", "name": "00 - Service document", "method": "GET", "code": "const r = await api.get(env.baseUrl + '/');" }
    ]
  }
]
```

`collections/` holds checked-in examples. `.claude/skills/bulky-collection/SKILL.md`
walks Claude through authoring one.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `⌘+Enter` / `Ctrl+Enter` | Run script |
| `Tab` | Indent 2 spaces in editor |
| Click card | Expand / collapse response detail |

## PWA

`pnpm build && pnpm start` then install via browser address bar. Offline shell cached on first load. Service worker scope: `/`. Manifest theme color `#0F172A`.

## Notes

- Project uses Next.js 16 — APIs may differ from older training data. Read `node_modules/next/dist/docs/` before adding routes or new conventions.
- Proxy at `/api/proxy` is intentionally permissive (local dev tool). Do not expose publicly without auth.
- Persisted responses capped at 50KB per entry to keep `localforage` payload bounded.

## Author

WAUX Studio — v1.0.0
