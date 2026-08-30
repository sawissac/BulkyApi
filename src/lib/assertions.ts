import type { Assertion } from "./types";

/** Sink the runner passes in — receives one record per resolved expectation. */
export type RecordAssertion = (a: Assertion) => void;

/** Chainable matcher surface returned by {@link makeExpect}'s `expect`. Every
 *  method records a pass/fail and returns the same object, so `.not` and
 *  further matchers can be chained. Nothing here throws. */
export type Matchers = {
  toBe(expected: unknown): Matchers;
  toEqual(expected: unknown): Matchers;
  toBeTruthy(): Matchers;
  toBeFalsy(): Matchers;
  toBeDefined(): Matchers;
  toBeNull(): Matchers;
  toContain(sub: unknown): Matchers;
  toMatch(pattern: RegExp | string): Matchers;
  toBeGreaterThan(n: number): Matchers;
  toBeLessThan(n: number): Matchers;
  toHaveProperty(key: string): Matchers;
  toHaveStatus(code: number): Matchers;
  toBeOk(): Matchers;
  readonly not: Matchers;
};

function fmtVal(v: unknown): string {
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "bigint") return `${v}n`;
  if (v === undefined) return "undefined";
  try {
    const s = JSON.stringify(v);
    return s.length > 80 ? `${s.slice(0, 77)}…` : s;
  } catch {
    return String(v);
  }
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }
  const ak = Object.keys(a as object);
  const bk = Object.keys(b as object);
  if (ak.length !== bk.length) return false;
  return ak.every((k) =>
    deepEqual(
      (a as Record<string, unknown>)[k],
      (b as Record<string, unknown>)[k],
    ),
  );
}

function contains(haystack: unknown, needle: unknown): boolean {
  if (typeof haystack === "string") return haystack.includes(String(needle));
  if (Array.isArray(haystack)) return haystack.some((x) => deepEqual(x, needle));
  if (haystack && typeof haystack === "object") {
    return Object.prototype.hasOwnProperty.call(haystack, String(needle));
  }
  return false;
}

/**
 * Builds the `expect` global handed to a script. `record` is called once per
 * resolved matcher with the outcome already adjusted for any `.not`.
 */
export function makeExpect(record: RecordAssertion) {
  return function expect(actual: unknown): Matchers {
    const build = (negate: boolean): Matchers => {
      const check = (pass: boolean, label: string, detail?: string): Matchers => {
        const ok = negate ? !pass : pass;
        record({
          ok,
          message: negate ? `not ${label}` : label,
          detail: ok ? undefined : detail,
        });
        return chain;
      };

      const status = (v: unknown): unknown =>
        v && typeof v === "object" && "status" in v
          ? (v as { status: unknown }).status
          : v;

      const chain: Matchers = {
        toBe: (expected) =>
          check(
            Object.is(actual, expected),
            `expected ${fmtVal(actual)} to be ${fmtVal(expected)}`,
            `got ${fmtVal(actual)}`,
          ),
        toEqual: (expected) =>
          check(
            deepEqual(actual, expected),
            `expected deep equality with ${fmtVal(expected)}`,
            `got ${fmtVal(actual)}`,
          ),
        toBeTruthy: () =>
          check(Boolean(actual), `expected ${fmtVal(actual)} to be truthy`),
        toBeFalsy: () =>
          check(!actual, `expected ${fmtVal(actual)} to be falsy`),
        toBeDefined: () =>
          check(actual !== undefined, `expected value to be defined`),
        toBeNull: () =>
          check(actual === null, `expected ${fmtVal(actual)} to be null`),
        toContain: (sub) =>
          check(
            contains(actual, sub),
            `expected ${fmtVal(actual)} to contain ${fmtVal(sub)}`,
          ),
        toMatch: (pattern) =>
          check(
            new RegExp(pattern).test(String(actual)),
            `expected ${fmtVal(actual)} to match ${pattern}`,
          ),
        toBeGreaterThan: (n) =>
          check(Number(actual) > n, `expected ${fmtVal(actual)} > ${n}`),
        toBeLessThan: (n) =>
          check(Number(actual) < n, `expected ${fmtVal(actual)} < ${n}`),
        toHaveProperty: (key) =>
          check(
            actual != null &&
              Object.prototype.hasOwnProperty.call(actual, key),
            `expected object to have property ${fmtVal(key)}`,
          ),
        toHaveStatus: (code) =>
          check(
            Number(status(actual)) === code,
            `expected status ${code}`,
            `got ${fmtVal(status(actual))}`,
          ),
        toBeOk: () => {
          const ok =
            actual && typeof actual === "object" && "ok" in actual
              ? Boolean((actual as { ok: unknown }).ok)
              : Boolean(actual);
          return check(ok, `expected response to be ok (2xx)`);
        },
        get not() {
          return build(!negate);
        },
      };

      return chain;
    };

    return build(false);
  };
}
