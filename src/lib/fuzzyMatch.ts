/**
 * Minimal ordered-subsequence fuzzy matcher for the command palette — no
 * dependency pulled in for this, the result sets involved (a few dozen
 * commands/examples/requests at most) don't need a real fuzzy-search engine.
 */

/** One match against a single target string. `indices` are the target's
 *  character positions the query matched, in order — unused today but kept
 *  for a future highlighted-match render. */
export type FuzzyResult = { score: number; indices: number[] };

/** Extra score for a query character landing right after the previous
 *  match — rewards contiguous runs over scattered hits. */
const CONSECUTIVE_BONUS = 15;

/** Extra score for a query character landing at the start of `target` or
 *  right after a non-alphanumeric character — rewards matching at the start
 *  of a word over matching mid-word. */
const WORD_BOUNDARY_BONUS = 10;

/**
 * Case-insensitive ordered-subsequence match: every character of `query`
 * must appear in `target`, in order, though not necessarily contiguously
 * ("cll" matches "Collection"). Returns `null` when it doesn't.
 *
 * Greedy leftmost — each query character takes the first available match at
 * or after the previous one, rather than searching all possible alignments
 * for the true best-scoring one. Cheap and good enough for palette-sized
 * lists; not a general-purpose fuzzy-search replacement.
 *
 * An empty `query` matches everything with a score of `0`.
 */
export function fuzzyMatch(query: string, target: string): FuzzyResult | null {
  if (!query) return { score: 0, indices: [] };

  const q = query.toLowerCase();
  const t = target.toLowerCase();

  const indices: number[] = [];
  let score = 0;
  let searchFrom = 0;
  let prevMatchIdx = -1;

  for (const ch of q) {
    const foundAt = t.indexOf(ch, searchFrom);
    if (foundAt === -1) return null;

    let charScore = 1;
    if (foundAt === prevMatchIdx + 1) charScore += CONSECUTIVE_BONUS;
    if (foundAt === 0 || !/[a-z0-9]/.test(t[foundAt - 1])) {
      charScore += WORD_BOUNDARY_BONUS;
    }

    score += charScore;
    indices.push(foundAt);
    prevMatchIdx = foundAt;
    searchFrom = foundAt + 1;
  }

  // Same match spread over a shorter target is a tighter, more relevant hit.
  score -= (target.length - query.length) * 0.1;

  return { score, indices };
}

/**
 * Scores and filters `items` by {@link fuzzyMatch} against `getText(item)`,
 * sorted best match first. A blank/whitespace-only `query` short-circuits to
 * every item, in its original order, score `0`.
 */
export function fuzzyFilter<T>(
  items: readonly T[],
  query: string,
  getText: (item: T) => string,
): Array<{ item: T; score: number }> {
  const q = query.trim();
  if (!q) return items.map((item) => ({ item, score: 0 }));

  const out: Array<{ item: T; score: number }> = [];
  for (const item of items) {
    const m = fuzzyMatch(q, getText(item));
    if (m) out.push({ item, score: m.score });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}
