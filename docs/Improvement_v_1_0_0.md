# Bulky API — Improvement & Optimization Checklist v1.0.0

## Performance
- [x] **Debounce `saveItemCode`** — `BulkyApp.tsx` debounces 400ms before dispatching to store
- [x] **Debounce `syncAnalyzedCalls`** — `BulkyApp.tsx` debounces 300ms; skips during run or item switch
- [x] **Memoize item lookup** — replaced `collections.flatMap(...).find(...)` with existing `selectActiveItem` selector
- [ ] **Stop spreading every call on every update** — `calls.map((c) => ({ ...c }))` in `scriptRunner.ts` still called per-update; requires larger architecture change (structural sharing / immer-based store for calls)
- [x] **Debounce timeout input** — moved to TweaksPanel with 400ms debounce on local state

## Code Quality / Architecture
- [x] **Extract auth header builder** — `buildAuthHeaders(opts, envVars)` extracted in `scriptRunner.ts`; shared by `makeCall` and `makeSseCall`
- [x] **Extract `onRun` to custom hook** — `src/hooks/useScriptRunner.ts` owns all run logic (run, next, stop, abort)
- [x] **Fix `eslint-disable` suppressions** — all 3 stale-dep suppressions removed; deps fixed properly in `BulkyApp.tsx`
- [x] **Fix `error: any`** — `proxy/route.ts` uses `unknown` + `instanceof Error` narrowing
- [x] **Replace `opts as never` casts** — `CallOpts` type defined; all `makeCall`/`makeSseCall` signatures use it
- [x] **Add error boundary** — `src/components/ErrorBoundary.tsx` wraps app in `providers.tsx`

## Memory / Unbounded Growth
- [x] **Prune `viewByItemId`** — `uiSlice.ts` uses `extraReducers` to delete entry on `removeItem`
- [x] **Prune `callsByItemId`** — `runnerSlice.ts` uses `extraReducers` to delete entry on `removeItem`
- [x] **Cap persisted response size** — `persist.ts` trims strings >50KB and objects whose JSON exceeds 50KB before writing to localforage

## Security
- [ ] **SSRF in proxy** — accepted risk for local dev tool; proxy is intentionally used to call local/private APIs. Blocking private IPs would break the primary use case. Deploy behind auth if exposing publicly.
- [x] **Add proxy timeout** — `proxy/route.ts` aborts upstream fetch after 30s; returns `"Proxy timeout"` error

## UX / Missing Features
- [x] **Keyboard shortcut for Run** — already implemented: `Cmd/Ctrl+Enter` wired in `MonacoCodeEditor.tsx`
- [x] **Abort running script** — `useScriptRunner` creates `AbortController` per run; `onStop` propagates abort signal through `runScript`; Stop button added to `CodeEditor` toolbar
- [x] **Console height** — console panel in `ResponsePanel` has expand/collapse toggle (90px collapsed → 240px expanded)
- [x] **Move timeout config to TweaksPanel** — removed from `ResponsePanel` header; now in `TweaksPanel` with debounced local input and clear button

## Maintainability
- [ ] **Migrate inline styles to Tailwind** — deferred; entire-app scope, high churn risk, no functional benefit
- [ ] **Type `ResizablePanel` sizes consistently** — deferred; needs `react-resizable-panels` v4 API audit
