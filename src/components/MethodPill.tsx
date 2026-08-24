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
  docs: "Documentation entry — not a live HTTP request.",
};

/**
 * HTTP method chip, hue read from the active theme's `--method-*` token —
 * light themes swap in darker equivalents so the pill stays legible on white.
 * Fill and border are `currentColor` mixes via the shared `tint-current`
 * utility, so one color decision drives all three. Hovering or focusing it
 * raises a tooltip naming what the method does; reach for it anywhere a call
 * or example needs to show which method it uses.
 *
 * @remarks
 * Status: stable — Type: primitive
 *
 * State & behavior: stateless. The tooltip's open/close timing is owned by
 * Radix's `Tooltip` — a 300ms hover delay, instant on keyboard focus — this
 * component only supplies the trigger and the content string.
 *
 * Variants:
 * - default — `sm` unset: 11px text, roomier padding.
 * - `sm` — 10px text, tighter padding, for dense rows like a collection list
 *   or the code editor toolbar.
 * - `focusable={false}` — drops the pill's own tab stop. Pointer hover still
 *   raises the tooltip; only keyboard reachability changes. Use this when the
 *   pill is already nested inside another interactive element (a button that
 *   cycles the method, a menu item) — a `tabIndex` on both would be invalid
 *   nested-interactive HTML and would double the row's tab stops.
 *
 * Composition: renders inside a Radix `Tooltip`; the pill itself is the
 * trigger (`asChild`), so no extra wrapping element changes its layout
 * footprint. The tooltip content portals to `document.body`, so it is never
 * clipped by a scrolling ancestor (the sidebar's collection list, in
 * particular).
 *
 * Accessibility: `tabIndex={0}` (default) makes the pill focusable even
 * though it is a `span`, so keyboard users reach the same tooltip mouse users
 * get; `focusable={false}` drops that to `-1` for the nested-button call
 * sites described under Variants. Radix wires `aria-describedby` from the
 * trigger to the tooltip content automatically either way.
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
 * the tooltip shows a generic line instead of a blank one.
 *
 * Dependencies: `@/components/ui/tooltip` (Radix `Tooltip` wrapper).
 *
 * @example
 * ```tsx
 * <MethodPill method="POST" sm />
 * ```
 */
export default function MethodPill({ method, sm, focusable = true }: MethodPillProps) {
  const info = METHOD_INFO[method.toLowerCase()] ?? "Custom or non-standard HTTP method.";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={focusable ? 0 : -1}
          style={{ color: `var(--method-${method.toLowerCase()}, var(--app-dim))` }}
          className={`shrink-0 cursor-help rounded-md border tint-current font-mono font-bold leading-none tracking-[0.04em] transition-[transform,filter] duration-200 hover:scale-105 hover:brightness-125 focus-visible:scale-105 focus-visible:brightness-125 focus-visible:outline-none ${
            sm ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]"
          }`}
        >
          {method}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <span className="block font-mono text-[11px] font-bold tracking-[0.04em] text-app-bright">
          {method.toUpperCase()}
        </span>
        <span className="mt-0.5 block text-app-dim">{info}</span>
      </TooltipContent>
    </Tooltip>
  );
}

export type MethodPillProps = {
  /** HTTP method to display, uppercased on render. Lowercased to key the
   *  `--method-*` color token and the tooltip's description lookup. */
  method: string;
  /** Compact sizing for dense rows — smaller text, tighter padding. */
  sm?: boolean;
  /** Set `false` when the pill is already nested inside another interactive
   *  element, so it does not add a second tab stop to that row.
   * @defaultValue `true` */
  focusable?: boolean;
};
