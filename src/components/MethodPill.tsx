"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** One-line semantics for each method this app actually renders. Unlisted or
 *  custom method strings fall back to a generic line rather than no tooltip. */
const METHOD_INFO: Record<string, string> = {
  get: "Retrieve a resource. Safe and idempotent — never modifies server state.",
  post: "Create a resource or trigger an action. Not idempotent — repeating it can create duplicates.",
  put: "Replace a resource entirely. Idempotent — repeating it leaves the same end state.",
  patch: "Partially update a resource. Idempotent-ness depends on the API.",
  delete: "Remove a resource. Idempotent — deleting twice has the same effect as once.",
  options: "Ask the server which methods and headers are allowed on this resource.",
  head: "Like GET, but returns headers only — no response body.",
  sse: "Server-Sent Events stream. Long-lived connection; the server pushes events as they occur.",
  ws: "WebSocket connection. Long-lived and bidirectional — send and receive messages until it closes.",
  io: "Socket.IO connection. Long-lived and bidirectional, with named events on top of the socket.",
  pgsql: "Raw SQL statement run against Postgres. Not an HTTP request — it goes out over the app's own database route.",
  docs: "Documentation entry — not a live HTTP request.",
};

/** Cycle order used when a caller opts into click-to-change via
 *  `onMethodChange`. Deliberately narrower than `METHOD_INFO` — SSE, the
 *  socket kinds, PGSQL and Docs are display-only labels, not methods a user
 *  picks for a live request. */
const CYCLE_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

/**
 * HTTP method chip, hue read from the active theme's `--method-*` token —
 * light themes swap in darker equivalents so the pill stays legible on white.
 * Fill and border are `currentColor` mixes via the shared `tint-current`
 * utility, so one color decision drives all three. Hovering or focusing it
 * raises a tooltip naming what the method does, plus an optional caller-
 * supplied `description` line. Pass `onMethodChange` to make the pill
 * clickable, cycling it through a fixed set of methods — omit it for a
 * read-only display, e.g. a past call's record. Reach for it anywhere a call
 * or example needs to show which method it uses.
 *
 * @remarks
 * Status: stable — Type: primitive
 *
 * State & behavior: stateless. `onMethodChange` cycling is computed purely
 * from the current `method` prop and the fixed `CYCLE_METHODS` order — the
 * caller owns and passes back the actual value, this component holds none of
 * its own.
 *
 * Variants:
 * - default — `sm` unset: 11px text, roomier padding.
 * - `sm` — 10px text, tighter padding, for dense rows like a collection list
 *   or the code editor toolbar.
 * - `focusable={false}` — drops the pill's own tab stop. Only applies to the
 *   read-only (`onMethodChange` unset) span variant — use this when that span
 *   is already nested inside another interactive element, so a `tabIndex` on
 *   both would be invalid nested-interactive HTML. Has no effect once
 *   `onMethodChange` is set, since that variant is a real `<button>`.
 * - `onMethodChange` set — root renders as a `<button>` instead of a `span`;
 *   clicking (or Enter/Space, for free from the native element) advances
 *   `method` to the next entry in `CYCLE_METHODS`, wrapping after `DELETE`.
 *   A `method` outside that list cycles to `GET` first, same as index `-1 + 1`.
 *
 * Composition: renders inside a Radix `Tooltip`; the pill itself is the
 * trigger (`asChild`), so no extra wrapping element changes its layout
 * footprint. The tooltip content portals to `document.body`, so it is never
 * clipped by a scrolling ancestor (the sidebar's collection list, in
 * particular).
 *
 * Accessibility: read-only variant — `tabIndex={0}` (default) makes the
 * `span` focusable so keyboard users reach the same tooltip mouse users get;
 * `focusable={false}` drops that to `-1` for the nested-button call sites
 * described under Variants. Interactive variant — the `<button>` is always
 * focusable and carries `aria-label` naming the current method and that
 * clicking changes it, so the visible `method` text is not the accessible
 * name. Radix wires `aria-describedby` from the trigger to the tooltip
 * content automatically either way.
 *
 * Test ids: none. This is a repeated shared primitive with no stable
 * per-instance id of its own — per `react-data-test`, a hardcoded id here
 * would collide the moment two pills render on one screen, which every
 * caller (a collection list, a call list) does. A caller needing to assert on
 * one specific pill selects it by position inside its own row's testid.
 *
 * CSS classes: none — Tailwind utilities plus the `tint-current` global
 * utility (`@/app/globals.css`) only.
 *
 * Edge cases: a `method` with no `--method-*` token (anything outside
 * `METHOD_INFO`'s keys) still renders — color falls back to `--app-dim` and
 * the tooltip shows a generic line instead of a blank one. `description`
 * omitted or empty renders no extra tooltip line at all, rather than a blank
 * one.
 *
 * Dependencies: `@/components/ui/tooltip` (Radix `Tooltip` wrapper).
 *
 * @example
 * ```tsx
 * <MethodPill method="POST" sm />
 * <MethodPill
 *   method={item.method}
 *   description="Bulk import endpoint — expects an array body."
 *   onMethodChange={(next) => dispatch(setItemMethod({ itemId: item.id, method: next }))}
 * />
 * ```
 *
 * @see {@link StatusPill}
 */
export default function MethodPill({
  method,
  description,
  sm,
  focusable = true,
  onMethodChange,
}: MethodPillProps) {
  const key = method.toLowerCase();
  const info = METHOD_INFO[key] ?? "Custom or non-standard HTTP method.";

  const pillClassName = `shrink-0 rounded-md border tint-current font-title font-semibold leading-none tracking-[0.04em] transition-[transform,filter] duration-200 hover:scale-105 hover:brightness-125 focus-visible:scale-105 focus-visible:brightness-125 focus-visible:outline-none ${
    onMethodChange ? "cursor-pointer" : "cursor-help"
  } ${sm ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]"}`;
  const pillStyle = { color: `var(--method-${key}, var(--app-dim))` };

  const cycleMethod = () => {
    const idx = CYCLE_METHODS.indexOf(method.toUpperCase());
    onMethodChange?.(CYCLE_METHODS[(idx + 1) % CYCLE_METHODS.length]);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {onMethodChange ? (
          <button
            type="button"
            onClick={cycleMethod}
            aria-label={`Method ${method.toUpperCase()}, click to change`}
            style={pillStyle}
            className={pillClassName}
          >
            {method}
          </button>
        ) : (
          <span tabIndex={focusable ? 0 : -1} style={pillStyle} className={pillClassName}>
            {method}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent>
        <span className="block font-title text-[11px] font-semibold tracking-[0.04em] text-app-bright">
          {method.toUpperCase()}
        </span>
        <span className="mt-0.5 block font-description text-app-dim">{info}</span>
        {description && (
          <span className="mt-1 block border-t border-app-border pt-1 font-description text-app-bright">
            {description}
          </span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export type MethodPillProps = {
  /** HTTP method to display, uppercased on render. Lowercased to key the
   *  `--method-*` color token and the tooltip's description lookup. */
  method: string;
  /** Extra line appended to the tooltip, below the built-in method
   *  description — e.g. a note on what this specific endpoint does. */
  description?: string;
  /** Compact sizing for dense rows — smaller text, tighter padding. */
  sm?: boolean;
  /** Set `false` when the pill is already nested inside another interactive
   *  element, so it does not add a second tab stop to that row. Ignored once
   *  `onMethodChange` is set — that variant is a `<button>` and is always
   *  focusable.
   * @defaultValue `true` */
  focusable?: boolean;
  /** Makes the pill clickable: cycles `method` through `GET → POST → PUT →
   *  PATCH → DELETE` (wrapping) and fires with the next value. Omit for a
   *  read-only pill — e.g. a completed call's record, where the method is
   *  fixed history, not something to edit.
   * @param next - the method to switch to */
  onMethodChange?: (next: string) => void;
};
