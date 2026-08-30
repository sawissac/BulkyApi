# Bulky API — Feature Roadmap v1.1.0

Proposed features for the next release. v1.0.0 was a cleanup/optimization pass;
v1.1.0 is about capability. Grouped by area, tagged by priority (P0 must-have,
P1 high-value, P2 nice-to-have) and rough effort (S/M/L).

Legend: `[ ]` not started · `[~]` partial · `[x]` done

---

## Scripting & Execution

- [x] **Assertions API** — `P0` `M` — shipped
  `expect(actual).toBe/toEqual/toBeTruthy/toContain/toMatch/toHaveStatus/toBeOk/…`
  with `.not`, plus `api.assert(cond, msg)`. Non-throwing: results collected onto
  the matching call card (`✓/✗` badge + **Tests** tab) and a run-level Tests
  strip. `src/lib/assertions.ts`, wired through `runScript` and `runnerSlice`.
- [x] **Capture response → env** — `P0` `S` — shipped
  `env.set('token', v)` / `env.get('token')` alongside the existing `env.x = v`.
  Changed vars surface in the Extracted panel to promote into the environment.
  `env` is now a proxy in `scriptRunner.ts`.
- [ ] **Data-driven runs** — `P1` `M`
  Attach a dataset (JSON/CSV rows) to an item; run the script once per row with
  `data.*` bound. One card group per row, aggregate pass/fail.
- [x] **`sleep(ms)` / delay helper** — `P1` `S` — shipped
  `await sleep(ms)` global; rejects immediately when the run is stopped.
- [ ] **Retry option** — `P1` `S`
  `{ retry: { count: 3, delay: 500, on: [502, 503] } }` per call.
- [ ] **Parallel calls** — `P1` `M`
  `api.all([...])` / `api.race([...])`. Waterfall view already exists — show
  overlapping bars.
- [x] **`api.head` / `api.options`** — `P2` `S` — shipped
  Both verbs on `api.*` and `api.server.*`, routed through the shared
  `makeCall` (no request body; `methodSendsBody` already excluded HEAD/OPTIONS).
  `scriptAnalyzer` regex detects them, `API_LIB` types them, `METHOD_CLR` /
  `MethodPill` already had the colors + tooltips. `src/lib/scriptRunner.ts`,
  `src/lib/scriptAnalyzer.ts`.
- [ ] **GraphQL helper** — `P2` `M`
  `api.graphql(url, query, variables)` — builds the POST body, surfaces
  `errors[]` distinctly from transport errors.
- [x] **Multipart / file upload** — `P1` `M` — shipped
  `api.file(accept?)` opens a native picker; `api.form(fields)` builds the
  `FormData` (a bare `File`/`Blob` also works as a raw body). Neither is
  JSON-encoded; `Content-Type` is left to the browser. `api.server.*`
  **streams** the upload through `/api/proxy` instead of wrapping it in JSON
  (`duplex: "half"` passthrough — no buffering, no size cap from re-encoding).
  Call record keeps a serializable summary (field names, file name/size/type),
  never the live object, so Redux/persistence don't choke on it. Payload tab
  and Copy-as-cURL (`-F` flags) both render the summary.
  `src/lib/requestBody.ts`, `src/app/api/proxy/route.ts`.
- [x] **Pre-run / post-run hooks** — `P2` `M` — shipped
  Per-collection `preRun` / `postRun` scripts, edited in `CollectionHooksDialog`
  from a collection's row (accent dot when set). `composeScript` folds the
  hooks around the item script into one source — each segment in its own block
  so locals don't collide; state crosses via `env.set()` / `env.get()`. Used
  by both `useScriptRunner` (the run) and `BulkyApp` (the card preview). Blank
  hooks are inert and leave the no-hooks path byte-identical.
  `src/lib/composeScript.ts`, `src/store/collectionsSlice.ts`.
  *Open:* `preRun` / `postRun` persist to localforage but the normalized
  Supabase schema doesn't carry them yet — local-only until a migration adds
  the columns.
- [ ] **Structural sharing for `calls`** — `P1` `L` *(carried from v1.0.0)*
  Replace `calls.map((c) => ({ ...c }))` per-update in `scriptRunner.ts` with
  immer / structural sharing. Prereq for large scripts staying smooth.

## Response Panel

- [ ] **Search / filter in JSON tree** — `P0` `M`
  Filter keys and values in the response viewer; jump to match.
- [x] **Copy as cURL** — `P0` `S` — shipped
  Terminal icon in the call-card header (once the call leaves idle) copies a
  runnable `curl` built from the resolved URL, sent headers and JSON body.
  `src/lib/toCurl.ts`.
- [x] **Non-JSON response rendering** — `P1` `M` — shipped
  `detectResponseKind` routes XML / HTML / text / image bodies away from the
  JSON tree: indented markup, a sandboxed HTML **Preview**, inline image from
  the call URL, RAW always available. `src/lib/responseFormat.ts`, `RespTab`.
  (Binary hex view still open.)
- [ ] **Response → TypeScript types** — `P1` `M`
  `jsonToTypeScript` already exists in the codebase — expose it: "Copy as
  interface" on the Response tab.
- [ ] **Snapshot / fixture save** — `P2` `M`
  Pin a response as the expected fixture; next run diffs against it.
- [ ] **Run-to-run diff** — `P2` `M`
  Pick two runs of the same item, side-by-side JSON diff.
- [ ] **Download response body** — `P2` `S`
  Save raw body to a file (works with the binary/file-upload work).

## Collections & Sidebar

- [ ] **Folder nesting** — `P0` `M`
  Items are flat today. Nested folders per the spec's "one scenario per file"
  scaling problem.
- [ ] **Run whole collection** — `P0` `L`
  Batch runner: run every item in order, produce a summary report
  (pass/fail/skip, duration). Depends on the Assertions API.
- [ ] **Drag to reorder** — `P1` `S`
  Reorder items and collections.
- [ ] **Duplicate item / collection** — `P1` `S`
- [ ] **Global search** — `P1` `M`
  Search item names + script bodies across all collections.
- [ ] **Collection-level variables** — `P2` `M`
  A scope between env and script — shared config that isn't environment-specific.

## Environments & Secrets

- [x] **Inline env var editor** — `P0` `M` — shipped
  `VarsPane` edits the active environment inline: click-to-rename key,
  click-to-edit value, add row, delete (via `ConfirmDialog`), reveal toggle
  for sensitive keys. Backed by `setVar` / `deleteVar` / `renameVar` in
  `collectionsSlice`. `src/features/sidebar/components/VarsPane.tsx`.
- [ ] **Encrypt sensitive vars at rest** — `P0` `M`
  `token` / `key` are masked in the UI but stored plaintext in localforage.
  Encrypt with a session passphrase or the Supabase-derived key.
- [ ] **Import from `.env`** — `P1` `S`
  Paste or upload a `.env` file to populate an environment.
- [ ] **Top-bar env switcher** — `P1` `S`
  Switch active environment without opening the sidebar pane.
- [x] **Global / base environment** — `P2` `M` — shipped
  `collections.baseVars` — one global key/value bag every environment inherits.
  `selectEnvVars` is now a memoized merge `{ ...baseVars, ...ownVars }` (own key
  wins), so completion, the analyzer preview and the runner all see the base
  layer with no extra wiring. The Vars pane stacks a **Base** `VarSection` above
  the environment's own, marking any base key the environment shadows.
  `src/store/collectionsSlice.ts`, `src/features/sidebar/components/VarsPane.tsx`.
  *Open:* `baseVars` persists to localforage only — same remote-schema gap as
  the run hooks.

## Auth

- [ ] **OAuth2 helper** — `P1` `L`
  Client-credentials and auth-code flows; cache the token, auto-attach, refresh
  before expiry.
- [ ] **Auto-refresh bearer on 401** — `P1` `M`
  Given a refresh config, retry the failed call once after refreshing.
- [ ] **Per-collection default auth** — `P2` `S`
  Set auth once for the collection instead of per call.

## Sync & Collaboration *(builds on the Supabase auth + cross-device work)*

- [ ] **Collection version history** — `P1` `L`
  Snapshot on save; view and restore previous versions.
- [ ] **Share collection via link** — `P1` `M`
  Read-only or copy-to-my-workspace share link.
- [ ] **Sync conflict UI** — `P0` `M`
  When two devices edit the same item, show a merge/pick dialog instead of
  last-write-wins.
- [ ] **Team workspaces** — `P2` `L`
  Shared collections with member roles.

## Run History & CI

- [ ] **Run history log** — `P0` `M`
  Persist every run (timestamp, item, pass/fail, duration). Sidebar tab to
  browse and re-open a past run.
- [ ] **Export run report** — `P1` `M`
  JUnit XML + HTML report for CI consumption.
- [ ] **Headless CLI runner** — `P2` `L`
  `bulky run collection.json --env dev` for pipelines. Reuses `scriptRunner.ts`
  without the browser proxy.

## Editor

- [x] **`api.*` / `env.*` IntelliSense** — `P0` `M` — shipped
  The `api` / `env` extra-libs already typed the client, options and responses
  and completed `{{env}}` keys; v1.1.0 extends `API_LIB` / `envLib` with the new
  `expect` matcher chain, `sleep`, `api.assert`, and `env.set` / `env.get`.
  (`await`-result shape hinting via generics is there; deeper inference open.)
- [ ] **Inline analyzer diagnostics** — `P1` `M`
  `scriptAnalyzer` already parses calls without executing — surface parse errors
  as squiggles.
- [ ] **Command palette (`⌘K`)** — `P1` `M`
  Run, switch item, switch env, insert snippet, change theme.
- [ ] **Snippet library** — `P2` `S`
  Auth block, pagination loop, poll-until, assertion template.
- [ ] **Multi-tab editing** — `P2` `M`
  Open several items at once.

## Import / Export

- [ ] **OpenAPI / Swagger import** — `P0` `L`
  Spec → collection of stub items, one per operation, with example bodies. High
  leverage for onboarding an existing API.
- [ ] **Postman collection import** — `P1` `M`
  Map Postman v2.1 requests + pre-request scripts to Bulky items.
- [ ] **HAR import** — `P2` `M`
  Browser network capture → replayable script.

## Platform / PWA

- [ ] **Offline run queue** — `P2` `M`
  Queue runs while offline, flush on reconnect (proxy calls only work online).
- [ ] **Print / export response as PDF** — `P2` `S`

## Quality & Infra *(carried from v1.0.0 deferred)*

- [ ] **Test suite** — `P0` `M`
  Unit tests for `scriptRunner`, `scriptAnalyzer`, `curlParser`, persist
  trimming, cross-slice cleanup reducers.
- [ ] **E2E smoke test** — `P1` `M`
  Load app → write script → run → assert card states. The `app-walker` skill
  covers the manual version.
- [ ] **Tailwind migration** — `P2` `L` *(deferred v1.0.0)*
  Inline styles → Tailwind, incrementally per feature folder.
- [ ] **Consistent `ResizablePanel` sizing** — `P2` `S` *(deferred v1.0.0)*
  Audit `react-resizable-panels` v4 API, one sizing convention.

---

## Suggested v1.1.0 cut (if scoping down)

Ship these, defer the rest:

1. ~~Assertions API + run summary~~ — done
2. ~~Capture response → env~~ — done
3. Run whole collection
4. Run history log
5. ~~Inline env var editor~~ — done
6. Encrypt sensitive vars at rest
7. Sync conflict UI
8. ~~`api.*` / `env.*` IntelliSense~~ — done
9. ~~Copy as cURL~~ done · Search in JSON tree still open
10. OpenAPI import
11. Test suite for the `lib/` core (now covering `assertions.ts`, `toCurl.ts`,
    `responseFormat.ts`)

Also shipped this pass: `sleep(ms)`, non-JSON response rendering, multipart/file upload (with proxy streaming), `api.head` / `api.options`, inline env var editor, pre-run / post-run hooks, global / base environment.
