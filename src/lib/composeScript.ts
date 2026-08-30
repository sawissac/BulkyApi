/**
 * Stitches a collection's pre-run / post-run hooks around the item script into
 * the single source string the runner executes and the analyzer previews.
 *
 * Each present segment is wrapped in its own block so a hook's local
 * declarations never collide with the item script's — state crosses between
 * them only through `env.set()` / `env.get()`, never lexical scope. A blank or
 * whitespace-only hook contributes nothing, and when both hooks are empty the
 * item script is returned byte-for-byte unchanged, so the common no-hooks path
 * keeps its original line numbers in error messages.
 *
 * The wrapping is plain block statements and `//` marker comments: it survives
 * the `// note:` preprocessing and the TypeScript → JavaScript transpile in
 * `scriptRunner`, and the `api.*` scan in `scriptAnalyzer` reads straight
 * through it.
 *
 * A `return` in a hook still returns from the whole run — hooks share the
 * runner's async function body — so teardown after a throw in the item script
 * is not guaranteed.
 */
export function composeScript(parts: {
  preRun?: string;
  code: string;
  postRun?: string;
}): string {
  const pre = parts.preRun?.trim() ? parts.preRun : "";
  const post = parts.postRun?.trim() ? parts.postRun : "";
  if (!pre && !post) return parts.code;

  const block = (label: string, body: string) =>
    `// ─── ${label} ───\n{\n${body}\n}\n`;

  return (
    (pre ? block("pre-run hook", pre) : "") +
    block("request script", parts.code) +
    (post ? block("post-run hook", post) : "")
  );
}
