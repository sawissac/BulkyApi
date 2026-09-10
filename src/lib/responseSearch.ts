/**
 * Search primitives behind the response body's search bar: a JSONPath query
 * for the structured (PRETTY) view and a plain substring scan for the text
 * (RAW / TS) views.
 *
 * The two are deliberately different tools. A JSON tree has structure worth
 * querying — `$..Id`, `$.value[?(@.SenderType=="LLM")]` — while the raw text
 * dump only has characters, so it gets a find-in-page style match count that
 * pairs with `react-highlight-words` in the view itself.
 */
import { JSONPath } from "jsonpath-plus";

/** One value a JSONPath query matched, with the normalized path that reached it. */
export type JsonQueryMatch = {
  /** Normalized JSONPath of the hit, e.g. `` $['value'][0]['Id'] ``. */
  path: string;
  value: unknown;
};

/** Outcome of {@link runJsonQuery} — a match list, or the parser's complaint. */
export type JsonQueryResult =
  | { ok: true; matches: JsonQueryMatch[] }
  | { ok: false; error: string };

/**
 * Runs a JSONPath expression over `json`.
 *
 * `eval: "safe"` is pinned rather than left to the library default: filter
 * expressions (`?(@.status >= 400)`) keep working, but they are evaluated by
 * jsonpath-plus's own parser instead of `eval`/`Function`, so a typed query
 * can never execute arbitrary JavaScript and the app stays CSP-clean.
 * `ignoreEvalErrors` keeps a filter that throws on one node (a missing
 * property, a type mismatch) from wiping out the whole result set.
 *
 * An empty or whitespace-only `query` is not an error — it returns no matches,
 * which callers read as "no query, show everything".
 */
export function runJsonQuery(json: unknown, query: string): JsonQueryResult {
  const path = query.trim();
  if (!path) return { ok: true, matches: [] };

  try {
    const hits = JSONPath({
      path,
      json: json as object,
      resultType: "all",
      wrap: true,
      eval: "safe",
      ignoreEvalErrors: true,
    }) as { path: string; value: unknown }[];

    return {
      ok: true,
      matches: hits.map((h) => ({ path: h.path, value: h.value })),
    };
  } catch (e) {
    return {
      ok: false,
      error: (e as Error).message || "Invalid JSONPath expression",
    };
  }
}

/** One hit inside a {@link JsonQueryMatchGroup} — the value plus the single
 *  path segment that separates it from the group's shared parent. */
export type JsonQueryGroupItem = {
  /** Last segment of the hit's path, unquoted: `Id`, `Message`, `0`. */
  leaf: string;
  /** The hit's full normalized path, kept for copy/debug of a single row. */
  path: string;
  value: unknown;
};

/** Sibling hits that share one parent path, e.g. every field matched inside
 *  `` $['value'][0] `` by a multi-field query like `$..Id,Message`. */
export type JsonQueryMatchGroup = {
  /** Shared parent path, `` $['value'][0] ``. Empty for a root (`$`) hit,
   *  which has no parent to group under. */
  parent: string;
  items: JsonQueryGroupItem[];
};

/** Splits a normalized JSONPath into its parent path and final segment.
 *  Handles both bracket forms jsonpath-plus emits — `['key']` and `[0]` — and
 *  tolerates a quoted key containing brackets, since the quotes are matched
 *  rather than the last `[`. */
const PATH_TAIL = /^(.*)\[(?:'((?:[^'\\]|\\.)*)'|(\d+))\]$/;

/**
 * Buckets a flat match list into sibling groups so a multi-field query reads
 * as one block per record instead of alternating single-value cards.
 *
 * A query like `$..Id,Message` returns `Id`, `Message`, `Id`, `Message`… in
 * document order; grouping by parent path turns that back into one entry per
 * `` $['value'][N] `` with both fields inside. Order is preserved: groups
 * appear in the order their first hit did, and items in the order they
 * matched, so the list still reads top-to-bottom like the document.
 *
 * A hit whose path has no parent segment (the root `$`, or anything the
 * bracket form does not cover) becomes its own single-item group with an
 * empty `parent` — the caller renders those as a plain full-path card.
 */
export function groupJsonQueryMatches(
  matches: JsonQueryMatch[],
): JsonQueryMatchGroup[] {
  const groups: JsonQueryMatchGroup[] = [];
  const byParent = new Map<string, JsonQueryMatchGroup>();

  for (const m of matches) {
    const tail = PATH_TAIL.exec(m.path);
    if (!tail) {
      groups.push({ parent: "", items: [{ leaf: m.path, ...m }] });
      continue;
    }

    const parent = tail[1];
    const leaf = tail[2] ?? tail[3] ?? "";
    const item: JsonQueryGroupItem = { leaf, path: m.path, value: m.value };

    const existing = byParent.get(parent);
    if (existing) {
      existing.items.push(item);
      continue;
    }

    const group: JsonQueryMatchGroup = { parent, items: [item] };
    byParent.set(parent, group);
    groups.push(group);
  }

  return groups;
}

/**
 * Counts case-insensitive, non-overlapping occurrences of `needle` in `text`.
 *
 * Mirrors what `react-highlight-words` will mark with `autoEscape` + the
 * default (case-insensitive) matcher, so the count shown next to the field
 * always equals the number of highlights on screen.
 */
export function countMatches(text: string, needle: string): number {
  if (!needle) return 0;
  const haystack = text.toLowerCase();
  const query = needle.toLowerCase();
  let count = 0;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(query, from);
    if (at === -1) return count;
    count++;
    from = at + query.length;
  }
}

/** Longest string the JSON tree prints before eliding — matches are counted
 *  over what it prints, so the count equals the marks on screen. */
export const TREE_STRING_LIMIT = 120;

/**
 * The text the JSON tree prints for a scalar, without a string's surrounding
 * quotes: the value itself for a string, `String(value)` for a number or
 * boolean, `"null"` for null. A string longer than {@link TREE_STRING_LIMIT}
 * is elided unless `full` is set, which is what the node's "see more" toggle
 * and an active find term both do.
 */
export function treeScalarText(value: unknown, full = false): string {
  if (value === null) return "null";
  if (typeof value !== "string") return String(value);
  return !full && value.length > TREE_STRING_LIMIT
    ? value.slice(0, TREE_STRING_LIMIT) + "…"
    : value;
}

/**
 * Counts the find-term hits the JSON tree will mark inside `data` — object
 * keys and scalar values, in the order the tree renders them (each key, then
 * that key's value; array items in order).
 *
 * Braces, commas and a string's quotes are chrome, not content, so a term that
 * only occurs there counts zero. Strings count in full, and collapsed nodes
 * count too: while a find term is active the tree expands every node and
 * prints every string whole, so each counted hit is on screen.
 */
export function countTreeMatches(data: unknown, needle: string): number {
  if (!needle) return 0;

  if (data === null || typeof data !== "object")
    return countMatches(treeScalarText(data, true), needle);

  if (Array.isArray(data))
    return data.reduce<number>(
      (sum, item) => sum + countTreeMatches(item, needle),
      0,
    );

  return Object.entries(data as Record<string, unknown>).reduce(
    (sum, [key, value]) =>
      sum + countMatches(key, needle) + countTreeMatches(value, needle),
    0,
  );
}
