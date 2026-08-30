/**
 * Bridge between the editor (which owns a TypeScript compiler) and the script
 * runner (which can only execute JavaScript).
 *
 * The runner must not import Monaco — it runs from a hook, not a component —
 * so {@link MonacoCodeEditor} registers its transpiler here on mount and
 * {@link toRunnableJs} picks it up. Until that happens the code is handed back
 * untouched, which is correct for plain JavaScript and only fails for a script
 * that used type syntax before the editor finished loading.
 */

type Transpiler = (code: string) => Promise<string>;

let impl: Transpiler | null = null;

/** Installs the TypeScript → JavaScript transpiler. Called by the editor once
 *  Monaco (and with it the TypeScript worker) is available. */
export function registerTranspiler(fn: Transpiler): void {
  impl = fn;
}

/** Whether a transpiler has been registered. */
export function hasTranspiler(): boolean {
  return impl !== null;
}

/**
 * Strips types from `code` and downlevels it to executable JavaScript.
 *
 * Throws on a syntax error, with the compiler's own message and line, so the
 * runner can report it as a script error instead of a raw `SyntaxError` from
 * `new AsyncFunction(...)`.
 */
export async function toRunnableJs(code: string): Promise<string> {
  if (!impl) return code;
  return impl(code);
}
