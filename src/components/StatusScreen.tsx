"use client";

import { useEffect, type ReactNode } from "react";
import type { Theme } from "@/lib/themes";
import { themeVars } from "@/lib/themes";

const TONE = {
  accent: "text-app-accent",
  error: "text-app-error",
  warn: "text-app-warn",
} as const;

export type StatusTone = keyof typeof TONE;

type Props = {
  /** Base for this screen's test ids — the root is `<testId>-root`, and the
   *  code, title, message and detail derive from it the same way. */
  testId: string;
  /** Theme whose variables are written onto the screen and the document root.
   *  Omit it and the screen renders on the `:root` fallback palette, which is
   *  what a context without a hydrated store (a crashed root layout) gets. */
  T?: Theme;
  /** Large mono figure — an HTTP status, matching how the app labels every
   *  other response. */
  code: string;
  /** One-line headline under the code. */
  title: string;
  /** Sentence explaining what happened and what to do next. */
  description: string;
  /** Which token colors the code and its rule. */
  tone?: StatusTone;
  /** Right side of the header strip — the requested path, a request id, or
   *  anything else that identifies what failed. Rendered mono. */
  meta?: string;
  /** Verbatim technical text (an error message). Rendered in a scrollable mono
   *  block, wrapped, never truncated. */
  detail?: string;
  /** Next.js error digest, shown under the detail block for support. */
  digest?: string;
  /** Action buttons, right-aligned in the footer. */
  children?: ReactNode;
};

/**
 * Full-screen status page — 404, a crashed route, a crashed root layout —
 * rendered as one of the app's own response cards rather than as browser
 * chrome.
 *
 * @remarks
 * Status: stable — Type: screen
 *
 * State & behavior: no local state. One effect mirrors `T` onto
 * `documentElement` (the CSS variables and `color-scheme`), so the scrollbars
 * and overscroll area match the card instead of falling back to the browser's
 * default surface; it runs only when a theme is passed and leaves the document
 * untouched otherwise.
 *
 * Variants: `tone` colors the code and its rule — `accent` for an expected
 * dead end like a 404, `error` for a failure, `warn` for a degraded state.
 *
 * Composition: header strip (app mark, name, optional `meta`), body (code,
 * title, description, optional `detail`/`digest`), footer holding whatever
 * actions the caller passes. Callers own the buttons so each screen decides
 * between retrying, reloading and navigating home.
 *
 * Accessibility: the card is a `role="alert"` region labelled by its title, so
 * a screen reader announces the failure on arrival. The code figure is
 * `aria-hidden` — the title carries the same meaning as text.
 *
 * Test ids: `<testId>-root`, `-code`, `-title`, `-message`, and `-detail` when
 * a detail block is rendered. Action ids belong to the caller.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens, with
 * the theme's own variables applied inline on the root.
 *
 * Edge cases: with no `T`, the `:root` fallback palette (the default `ocean`
 * theme) applies and the document root is left alone. A `detail` longer than
 * the block scrolls inside it rather than growing the card.
 *
 * Dependencies: `@/lib/themes`, `/favicon.svg` (the app mark the activity rail
 * renders).
 *
 * @example
 * ```tsx
 * <StatusScreen testId="not-found" T={T} code="404" title="Not Found" description="…">
 *   <Link href="/">Back to app</Link>
 * </StatusScreen>
 * ```
 */
export default function StatusScreen({
  testId,
  T,
  code,
  title,
  description,
  tone = "accent",
  meta,
  detail,
  digest,
  children,
}: Props) {
  useEffect(() => {
    if (!T) return;
    const root = document.documentElement;
    for (const [key, value] of Object.entries(themeVars(T))) {
      root.style.setProperty(key, value);
    }
    root.style.colorScheme = T.isLight ? "light" : "dark";
  }, [T]);

  return (
    <div
      style={T ? (themeVars(T) as React.CSSProperties) : undefined}
      data-testid={`${testId}-root`}
      className="flex h-full w-full items-center justify-center overflow-auto bg-app-bg p-6 font-sans text-app-text"
    >
      <div
        role="alert"
        aria-labelledby={`${testId}-title`}
        className="w-[min(520px,100%)] overflow-hidden rounded-lg border-2 border-app-border-mid bg-app-panel"
      >
        {/* Header strip — reads like the response card the app shows for a call */}
        <div className="flex items-center gap-2 border-b border-app-border bg-app-sidebar px-4 py-2.5">
          <img
            src="/favicon.svg"
            alt=""
            width={16}
            height={16}
            className="shrink-0 rounded-sm"
            aria-hidden="true"
          />
          <span className="font-title text-[11px] font-semibold uppercase tracking-[0.1em] text-app-dim">
            Bulky API
          </span>
          {meta && (
            <span className="ml-auto min-w-0 truncate font-mono text-[11px] text-app-dim">
              {meta}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 px-5 py-6">
          <div className="flex flex-col gap-1">
            <span
              data-testid={`${testId}-code`}
              aria-hidden="true"
              className={`font-mono text-[52px] leading-none font-bold tracking-[-0.04em] ${TONE[tone]}`}
            >
              {code}
            </span>
            <span
              className={`h-0.5 w-10 rounded-full bg-current ${TONE[tone]}`}
              aria-hidden="true"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <h1
              id={`${testId}-title`}
              data-testid={`${testId}-title`}
              className="font-title text-[15px] font-semibold tracking-[-0.01em] text-app-bright"
            >
              {title}
            </h1>
            <p
              data-testid={`${testId}-message`}
              className="font-description text-[12px] leading-relaxed text-app-dim"
            >
              {description}
            </p>
          </div>

          {detail && (
            <pre
              data-testid={`${testId}-detail`}
              className="max-h-[150px] overflow-auto rounded-md border border-app-border bg-app-editor px-3 py-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-app-text"
            >
              {detail}
            </pre>
          )}

          {digest && (
            <span className="font-mono text-[10px] text-app-dim">
              digest {digest}
            </span>
          )}
        </div>

        {/* Footer actions */}
        {children && (
          <div className="flex items-center justify-end gap-2 border-t border-app-border px-4 py-3">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

/** Solid primary action — the app's accent block, same recipe as Run. */
export const STATUS_ACTION =
  "flex h-8 shrink-0 items-center gap-1.5 rounded-md border-0 bg-app-accent px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-app-on-solid transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel";

/** Quiet secondary action — outlined, for the path away from the primary one. */
export const STATUS_ACTION_GHOST =
  "flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-app-border bg-transparent px-3.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-app-dim transition-colors duration-200 hover:bg-app-hover hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel";
