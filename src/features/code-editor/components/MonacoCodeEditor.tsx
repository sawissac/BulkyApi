"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type {
  editor as MonacoEditorNS,
  languages,
  Position,
} from "monaco-editor";
import type { Theme } from "@/lib/themes";
import { registerTranspiler } from "@/lib/transpile";

export type EditorInstance = MonacoEditorNS.IStandaloneCodeEditor;

/** Scratch file the TypeScript worker emits from. Created per transpile and
 *  disposed straight after; the appended `export {}` makes it a module, so the
 *  script's declarations live in their own scope instead of colliding with the
 *  editor's own model in the shared global one. */
const TRANSPILE_URI = "file:///bulky-transpile.ts";
const MODULE_MARKER = "\nexport {};\n";

/** Ambient declarations for the runtime globals the script runner injects
 *  (`api`, `env`) — see `runScript` in `@/lib/scriptRunner`. Registered as an
 *  extra lib so the TypeScript worker types `api.*` calls, their options and
 *  their responses instead of falling back to a hand-rolled completion list. */
const API_LIB = `
interface BulkyAuth {
  type: 'bearer' | 'basic' | 'apikey';
  token?: string;
  username?: string;
  password?: string;
  /** Header name for \`apikey\` auth. @defaultValue "X-API-Key" */
  header?: string;
  key?: string;
}

interface BulkyCallOpts {
  auth?: BulkyAuth;
  headers?: Record<string, string>;
}

interface BulkyResponse<T = any> {
  /** Parsed JSON body, or the raw text when the body is not JSON. */
  data: T;
  status: number;
  headers: Record<string, string>;
  /** True for a 2xx status. */
  ok: boolean;
}

interface BulkySseEvent {
  type: string;
  data: string;
  id?: string;
}

interface BulkyStreamOpts extends BulkyCallOpts {
  /** Verb used to open the stream. @defaultValue \`'GET'\` for \`sse\`, \`'POST'\` for \`stream\` */
  method?: string;
  /** JSON body sent with the request that opens the stream — an LLM
   *  chat/completions payload, typically. */
  body?: unknown;
}

interface BulkyStreamResult {
  /** Aborts the stream early — same effect as the run itself being stopped. */
  close(): void;
  /** Resolves once the stream ends (or fails), with everything received. */
  done: Promise<{ events: BulkySseEvent[]; text: string; status: number | null }>;
}

interface BulkyStream {
  /** Streams an SSE endpoint, calling \`onEvent\` per event until closed. Each
   *  event also renders live on the call's Response tab as it arrives. */
  sse(
    url: string,
    opts?: BulkyStreamOpts,
    onEvent?: (event: BulkySseEvent) => void,
  ): Promise<BulkyStreamResult>;
  /** POSTs (by default) \`body\` and streams the \`event-stream\` reply live — an
   *  LLM chat/completions call, typically. \`api.sse\` is GET-only with no
   *  body; this is its POST counterpart. Pass \`opts.method\` to override the
   *  verb. */
  stream(
    url: string,
    body?: unknown,
    opts?: BulkyCallOpts,
    onEvent?: (event: BulkySseEvent) => void,
  ): Promise<BulkyStreamResult>;
}

interface BulkyWsOpts {
  /** Sub-protocol(s) for the WS handshake. A browser socket can't set custom
   *  headers on the upgrade request, so this is the only connection option. */
  protocols?: string | string[];
}

interface BulkyIoOpts {
  path?: string;
  query?: Record<string, string>;
  auth?: Record<string, unknown>;
  transports?: string[];
  [key: string]: unknown;
}

/** One sent/received frame, or an \`open\`/\`close\`/\`error\` lifecycle row —
 *  also what streams live onto the call's Response tab as it happens. */
interface BulkyWsEvent {
  direction: 'in' | 'out' | 'system';
  /** Socket.IO event name; \`"message"\` for a raw WS text frame; \`"open"\` /
   *  \`"close"\` / \`"error"\` for a lifecycle row. */
  event?: string;
  data: string;
  ts: number;
}

interface BulkySocketHandle {
  /** Sends over the open connection — an object is JSON-stringified first. */
  send(data: string | object): void;
  /** Closes the connection early — same effect as the run being stopped. */
  close(code?: number, reason?: string): void;
}

interface BulkyIoHandle extends BulkySocketHandle {
  /** Sends a named Socket.IO event. \`send(data)\` is sugar for
   *  \`emit('message', data)\`. */
  emit(event: string, ...args: unknown[]): void;
}

interface BulkySocket {
  /** Opens a native WebSocket, resolving once connected with \`{ send, close
   *  }\` to keep using for the rest of the run — reject if it never opens.
   *  Every sent/received frame and connection event also renders live on the
   *  call's Response tab. No \`api.server.ws\` — a browser WebSocket doesn't
   *  hit CORS the way \`fetch\` does, so there's nothing to route around. */
  ws(url: string, opts?: BulkyWsOpts): Promise<BulkySocketHandle>;
  /** Same as \`ws\`, over Socket.IO — \`onEvent\` fires for every event
   *  received, any name. The returned handle adds \`emit\` for named events. */
  io(
    url: string,
    opts?: BulkyIoOpts,
    onEvent?: (event: { event: string; data: unknown }) => void,
  ): Promise<BulkyIoHandle>;
}

/** \`body\` may be a \`FormData\` (from {@link BulkyApi.form}) or a raw \`File\` /
 *  \`Blob\` (from {@link BulkyApi.file}) — either is sent as-is, never
 *  JSON-encoded, and \`Content-Type\` is left for the browser to set. */
interface BulkyHttp {
  /** GET \`url\`. \`{{var}}\` in the URL is resolved from the active environment. */
  get<T = any>(url: string, opts?: BulkyCallOpts): Promise<BulkyResponse<T>>;
  post<T = any>(url: string, body: unknown, opts?: BulkyCallOpts): Promise<BulkyResponse<T>>;
  put<T = any>(url: string, body: unknown, opts?: BulkyCallOpts): Promise<BulkyResponse<T>>;
  patch<T = any>(url: string, body: unknown, opts?: BulkyCallOpts): Promise<BulkyResponse<T>>;
  delete<T = any>(url: string, opts?: BulkyCallOpts): Promise<BulkyResponse<T>>;
  /** Asks which methods/headers the resource allows. No request body; the
   *  response body is usually empty — read \`headers\` / \`status\`. */
  options<T = any>(url: string, opts?: BulkyCallOpts): Promise<BulkyResponse<T>>;
  /** Like GET but headers only — no request or response body. Read
   *  \`headers\` / \`status\` off the result. */
  head<T = any>(url: string, opts?: BulkyCallOpts): Promise<BulkyResponse<T>>;
}

interface BulkyServer extends BulkyHttp, BulkyStream {}

interface BulkyApi extends BulkyHttp, BulkyStream, BulkySocket {
  /** Same verbs (plus \`sse\`/\`stream\`), routed through \`/api/proxy\` — use when
   *  CORS blocks the browser from calling the host directly (most hosted LLM
   *  APIs do). Files upload through it too: the proxy streams the body
   *  straight to the target instead of JSON-encoding it. */
  server: BulkyServer;
  /** Records a pass/fail check against the run. Never throws — a falsy
   *  \`condition\` is collected and shown on the call card and run summary. */
  assert(condition: unknown, message?: string): void;
  /** Opens a native file picker and resolves with the chosen file. \`accept\`
   *  is a standard file-input accept string, e.g. \`'image/*'\`. Rejects if the
   *  picker is dismissed with nothing chosen. */
  file(accept?: string): Promise<File>;
  /** Builds a multipart \`FormData\` body. A \`File\`/\`Blob\` value becomes a file
   *  field; anything else is coerced to a string field. */
  form(fields: Record<string, unknown>): FormData;
}

/** HTTP client injected by the Bulky runtime. */
declare const api: BulkyApi;

/** Chainable expectations. Every matcher records a pass/fail and returns \`this\`
 *  so \`.not\` and further matchers chain. Nothing here throws. */
interface BulkyMatchers {
  toBe(expected: unknown): BulkyMatchers;
  toEqual(expected: unknown): BulkyMatchers;
  toBeTruthy(): BulkyMatchers;
  toBeFalsy(): BulkyMatchers;
  toBeDefined(): BulkyMatchers;
  toBeNull(): BulkyMatchers;
  toContain(sub: unknown): BulkyMatchers;
  toMatch(pattern: RegExp | string): BulkyMatchers;
  toBeGreaterThan(n: number): BulkyMatchers;
  toBeLessThan(n: number): BulkyMatchers;
  toHaveProperty(key: string): BulkyMatchers;
  /** Passes when \`actual\` (or \`actual.status\`) equals \`code\`. */
  toHaveStatus(code: number): BulkyMatchers;
  /** Passes when \`actual.ok\` is true, or \`actual\` itself is truthy. */
  toBeOk(): BulkyMatchers;
  readonly not: BulkyMatchers;
}

/** Opens a chain of expectations over \`actual\`. */
declare function expect(actual: unknown): BulkyMatchers;

/** Resolves after \`ms\` milliseconds. Rejects at once if the run is stopped. */
declare function sleep(ms: number): Promise<void>;
`;

/** Diagnostics that only make sense for a real module and would light up every
 *  script: a Bulky script is a bare statement list executed inside an async
 *  function, so its top-level \`await\` is legal even though the worker sees a
 *  non-module file. */
const IGNORED_DIAGNOSTICS = [1375, 1378, 1308];

function envLib(envVars: Record<string, string>): string {
  const keys = Object.entries(envVars).map(([k, v]) => {
    const safe = String(v ?? "").replace(/\*\//g, "*\\/");
    const doc = safe ? `  /** \`"${safe}"\` */\n` : "  /** (empty) */\n";
    const prop = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `'${k}'`;
    return `${doc}  readonly ${prop}: string;`;
  });
  return [
    "/** Variables of the active environment. Also usable as `{{name}}` inside a URL. */",
    "declare const env: {",
    ...keys,
    "  readonly [key: string]: string;",
    "} & {",
    "  /** Set a variable for the rest of this run; offered in the Extracted panel afterwards. */",
    "  set(key: string, value: unknown): void;",
    "  /** Read a variable of the active environment. */",
    "  get(key: string): string | undefined;",
    "};",
  ].join("\n");
}

function diagnosticText(messageText: unknown): string {
  if (typeof messageText === "string") return messageText;
  const chain = messageText as { messageText?: unknown } | null;
  return chain?.messageText ? diagnosticText(chain.messageText) : "Syntax error";
}

/**
 * Coerces a theme color to the `#rrggbb(aa)` form Monaco's `defineTheme`
 * requires. Monaco silently ignores `rgb()/rgba()` values and the affected keys
 * fall back to the base VS theme — which is why the suggest widget kept the
 * stock selection colors instead of the Bulky palette. Already-hex values pass
 * through untouched.
 */
function hex(color: string): string {
  const m = color.match(/^rgba?\(([^)]+)\)$/i);
  if (!m) return color;
  const parts = m[1].split(",").map((p) => p.trim());
  const chan = (p: string) =>
    Math.max(0, Math.min(255, Math.round(parseFloat(p))))
      .toString(16)
      .padStart(2, "0");
  const alpha =
    parts[3] === undefined
      ? ""
      : Math.max(0, Math.min(255, Math.round(parseFloat(parts[3]) * 255)))
          .toString(16)
          .padStart(2, "0");
  return `#${chan(parts[0])}${chan(parts[1])}${chan(parts[2])}${alpha}`;
}

type Props = {
  /** Current script source. Controlled — the parent owns the buffer. */
  value: string;
  /** Fires on every keystroke with the full buffer, never with `undefined`. */
  onChange: (v: string) => void;
  /** Active environment's variables, surfaced as `env.*` types and as `{{name}}`
   *  completions inside strings. Re-read on every completion, so a change mid
   *  session needs no remount. */
  envVars: Record<string, string>;
  /** Active theme; its colors are compiled into Monaco's `bulky` theme. */
  T: Theme;
  /** Fires on ⌘↵ / Ctrl+↵ inside the editor. */
  onRun: () => void;
  /** Fires once with the editor instance, for imperative actions (format). */
  onMount?: (editor: EditorInstance) => void;
};

/**
 * The Monaco instance behind the editor panel, wired for the Bulky script
 * runtime: TypeScript language services, typed `api`/`env` globals, and the
 * TypeScript → JavaScript transpiler the runner executes.
 *
 * @remarks
 * Status: stable — Type: editor
 *
 * State & behavior: `monaco` holds the instance captured in `beforeMount`;
 * every effect no-ops until it lands. The theme effect compiles `T` into a
 * Monaco theme named `bulky` and re-defines it whenever the colors change;
 * every value is pushed through {@link hex} first because `defineTheme` drops
 * `rgba()` colors silently (which left the suggest widget on the stock VS
 * selection colors).
 * The language effect sets the TypeScript compiler options once and registers
 * the transpiler with `@/lib/transpile`, which the runner calls before
 * executing — the emit runs on a scratch model that is disposed straight
 * after, so it never collides with the editor's own model, and syntactic
 * diagnostics are raised as an `Error` carrying the compiler's message and
 * line. The globals effect re-publishes the `env` declarations as an extra lib
 * on every `envVars` change; the `api` lib — which also declares the `expect`
 * and `sleep` runtime helpers — is static.
 *
 * Variants: none.
 *
 * Composition: renders `@monaco-editor/react`'s `Editor` in `typescript` mode.
 * Type annotations are stripped at run time, so plain JavaScript scripts keep
 * working unchanged.
 *
 * Accessibility: Monaco owns its own focus, ARIA and keyboard model. ⌘↵ /
 * Ctrl+↵ is bound to `onRun` in addition to the panel's own Run button. ⌘C /
 * Ctrl+C triggers the completion widget when the selection is empty, and
 * still copies whenever text is selected — so the standard copy path is only
 * shadowed on an empty caret, where it was a no-op anyway.
 *
 * Test ids: none — Monaco renders its own DOM.
 *
 * CSS classes: none — the editor is themed through Monaco, not Tailwind.
 *
 * Edge cases: a run fired before this component mounts finds no registered
 * transpiler and executes the buffer as-is — fine for JavaScript, a syntax
 * error for type syntax. `{{name}}` completions live in a manual provider
 * because they sit inside string literals, where the language service offers
 * nothing.
 *
 * Dependencies: `@monaco-editor/react`, `monaco-editor` (types only),
 * `@/lib/transpile`, `@/lib/themes`.
 *
 * @example
 * ```tsx
 * <MonacoCodeEditor
 *   value={code}
 *   onChange={setCode}
 *   envVars={envVars}
 *   T={theme}
 *   onRun={onRun}
 * />
 * ```
 *
 * @see {@link registerTranspiler}
 */
export default function MonacoCodeEditor({
  value,
  onChange,
  envVars,
  T,
  onRun,
  onMount,
}: Props) {
  const [monaco, setMonaco] = useState<Monaco | null>(null);
  const envVarsRef = useRef(envVars);

  useEffect(() => {
    envVarsRef.current = envVars;
  }, [envVars]);

  const transpile = useCallback(
    async (m: Monaco, code: string): Promise<string> => {
      const uri = m.Uri.parse(TRANSPILE_URI);
      const source = code + MODULE_MARKER;
      const model =
        m.editor.getModel(uri) ??
        m.editor.createModel(source, "typescript", uri);
      model.setValue(source);
      try {
        const getWorker = await m.languages.typescript.getTypeScriptWorker();
        const client = await getWorker(uri);
        const fileName = uri.toString();

        const syntactic = await client.getSyntacticDiagnostics(fileName);
        if (syntactic.length > 0) {
          const d = syntactic[0];
          const pos = model.getPositionAt(d.start ?? 0);
          throw new Error(
            `${diagnosticText(d.messageText)} (line ${pos.lineNumber})`,
          );
        }

        const out = (await client.getEmitOutput(fileName)) as {
          outputFiles: { name: string; text: string }[];
        };
        const js = out.outputFiles.find((f) => f.name.endsWith(".js"))?.text;
        return js === undefined
          ? code
          : js.replace(/export\s*\{\s*\};?\s*$/, "");
      } finally {
        model.dispose();
      }
    },
    [],
  );

  // Define theme once Monaco is ready, re-define when theme colors change
  useEffect(() => {
    if (!monaco) return;
    monaco.editor.defineTheme("bulky", {
      base: T.isLight ? "vs" : "vs-dark",
      inherit: true,
      rules: T.isLight
        ? [
            { token: "comment", foreground: "8f7d68", fontStyle: "italic" },
            { token: "keyword", foreground: "7c2d12" },
            { token: "string", foreground: "3f6212" },
            { token: "number", foreground: "9a3412" },
            { token: "regexp", foreground: "b91c1c" },
            { token: "type", foreground: "6d28d9" },
            { token: "variable", foreground: "1c110b" },
            { token: "identifier", foreground: "1c110b" },
            { token: "delimiter", foreground: "6b5442" },
          ]
        : [
            { token: "comment", foreground: "4a5568", fontStyle: "italic" },
            { token: "keyword", foreground: "67e8f9" },
            { token: "string", foreground: "86efac" },
            { token: "number", foreground: "fdba74" },
            { token: "regexp", foreground: "fca5a5" },
            { token: "type", foreground: "c4b5fd" },
            { token: "variable", foreground: "e2e8f0" },
            { token: "identifier", foreground: "e2e8f0" },
            { token: "delimiter", foreground: "64748b" },
          ],
      colors: Object.fromEntries(
        Object.entries({
          "editor.background": T.editorBg,
          "editor.foreground": T.textBright,
          "editorLineNumber.foreground": T.lineNum,
          "editorLineNumber.activeForeground": T.cyan,
          "editor.selectionBackground": `${T.cyan}22`,
          "editor.inactiveSelectionBackground": `${T.cyan}11`,
          "editor.lineHighlightBackground": T.isLight ? "#00000008" : "#ffffff05",
          "editor.lineHighlightBorder": "#00000000",
          "editorCursor.foreground": T.cyan,
          "editorGutter.background": T.gutterBg,
          "editorIndentGuide.background1": T.border,
          "editorIndentGuide.activeBackground1": T.borderMid,

          "editorWidget.background": T.bgPanel,
          "editorWidget.foreground": T.text,
          "editorWidget.border": T.borderMid,

          "editorSuggestWidget.background": T.bgPanel,
          "editorSuggestWidget.foreground": T.text,
          "editorSuggestWidget.border": T.borderMid,
          "editorSuggestWidget.selectedBackground": T.bgSelected,
          "editorSuggestWidget.selectedForeground": T.textBright,
          "editorSuggestWidget.selectedIconForeground": T.cyan,
          "editorSuggestWidget.highlightForeground": T.cyan,
          "editorSuggestWidget.focusHighlightForeground": T.cyan,
          "editorSuggestWidgetStatus.foreground": T.textDim,

          "editorHoverWidget.background": T.bgPanel,
          "editorHoverWidget.foreground": T.text,
          "editorHoverWidget.border": T.borderMid,

          "editorError.foreground": T.error,
          "editorWarning.foreground": T.warn,

          focusBorder: T.borderAccent,
          "list.hoverBackground": T.bgHover,
          "list.hoverForeground": T.textBright,
          "list.focusBackground": T.bgSelected,
          "list.focusForeground": T.textBright,
          "list.focusOutline": T.borderAccent,
          "list.activeSelectionBackground": T.bgSelected,
          "list.activeSelectionForeground": T.textBright,
          "list.inactiveSelectionBackground": T.bgSelected,

          "scrollbarSlider.background": `${T.cyan}18`,
          "scrollbarSlider.hoverBackground": `${T.cyan}30`,
          "editor.findMatchBackground": `${T.cyan}30`,
          "editor.findMatchHighlightBackground": `${T.cyan}18`,
        }).map(([k, v]) => [k, hex(v)]),
      ),
    });
    monaco.editor.setTheme("bulky");
  }, [monaco, T]);

  // TypeScript services + the transpiler the runner executes through
  useEffect(() => {
    if (!monaco) return;
    const ts = monaco.languages.typescript;

    ts.typescriptDefaults.setCompilerOptions({
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      lib: ["esnext", "dom"],
      allowNonTsExtensions: true,
      allowJs: true,
      skipLibCheck: true,
      strict: false,
      noImplicitAny: false,
      noEmit: false,
    });
    ts.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      diagnosticCodesToIgnore: IGNORED_DIAGNOSTICS,
    });
    ts.typescriptDefaults.addExtraLib(API_LIB, "file:///bulky-api.d.ts");

    registerTranspiler((code) => transpile(monaco, code));
  }, [monaco, transpile]);

  // Environment variables as typed `env` members, refreshed as they change
  useEffect(() => {
    if (!monaco) return;
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      envLib(envVars),
      "file:///bulky-env.d.ts",
    );
  }, [monaco, envVars]);

  // `{{var}}` completions — they sit inside string literals, where the
  // language service offers nothing.
  useEffect(() => {
    if (!monaco) return;

    const disp = monaco.languages.registerCompletionItemProvider("typescript", {
      triggerCharacters: ["{"],
      provideCompletionItems(
        model: MonacoEditorNS.ITextModel,
        position: Position,
      ) {
        const line = model.getLineContent(position.lineNumber);
        const before = line.substring(0, position.column - 1);
        if (!before.endsWith("{{")) return { suggestions: [] };

        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: position.column,
          endColumn: position.column,
        };

        const suggestions: languages.CompletionItem[] = Object.entries(
          envVarsRef.current,
        ).map(
          ([k, v]) =>
            ({
              label: k,
              kind: monaco.languages.CompletionItemKind.Variable,
              detail: v ? `"${v}"` : "(empty)",
              insertText: `${k}}}`,
              range,
            }) as languages.CompletionItem,
        );

        return { suggestions };
      },
    });

    return () => disp.dispose();
  }, [monaco]);

  return (
    <Editor
      height="100%"
      language="typescript"
      path="file:///bulky-script.ts"
      value={value}
      onChange={(v) => onChange(v ?? "")}
      theme="bulky"
      options={{
        fontSize: 12,
        fontFamily: "'JetBrains Mono', monospace",
        lineHeight: 20,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        wordWrap: "off",
        padding: { top: 12, bottom: 12 },
        renderLineHighlight: "line",
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        formatOnPaste: true,
        tabSize: 2,
        insertSpaces: true,
        snippetSuggestions: "top",
        suggest: { snippetsPreventQuickSuggestions: false },
        quickSuggestions: { other: true, comments: false, strings: true },
        fixedOverflowWidgets: true,
      }}
      beforeMount={(m) => setMonaco(m)}
      onMount={(editor, monacoInstance) => {
        editor.addCommand(
          monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter,
          onRun,
        );
        editor.addCommand(
          monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyC,
          () => {
            const sel = editor.getSelection();
            editor.trigger(
              "keyboard",
              sel && !sel.isEmpty()
                ? "editor.action.clipboardCopyAction"
                : "editor.action.triggerSuggest",
              {},
            );
          },
        );
        onMount?.(editor);
      }}
    />
  );
}
