"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { ArrowLeft, Home } from "lucide-react";
import { THEMES } from "@/lib/themes";
import { selectTheme } from "@/store/uiSlice";
import StatusScreen, {
  STATUS_ACTION,
  STATUS_ACTION_GHOST,
} from "@/components/StatusScreen";

/**
 * The app's 404 screen, rendered for any URL that matches no route.
 *
 * @remarks
 * Status: stable — Type: route screen
 *
 * State & behavior: no local state. The theme comes from the store, which the
 * providers hydrate from the local cache, so a 404 opened in a fresh tab
 * repaints in the user's own theme once hydration lands; until then it shows
 * the `:root` default. The requested path is read with `usePathname` and shown
 * in the card header.
 *
 * Variants: none.
 *
 * Composition: {@link StatusScreen} with an accent tone, a primary link back
 * to the app and a ghost Back action that pops one history entry.
 *
 * Accessibility: both actions are real controls — a link for navigation, a
 * button for history — so keyboard and screen-reader semantics are the browser's.
 *
 * Test ids: `not-found-home-link`, `not-found-back-button`; the screen itself
 * carries the `not-found-*` ids {@link StatusScreen} derives.
 *
 * CSS classes: none — the shared action recipes over `app-*` theme tokens.
 *
 * Edge cases: rendered outside a run, so nothing here depends on the runner or
 * on collections being loaded.
 *
 * Dependencies: `next/link`, `next/navigation`, `react-redux`,
 * `lucide-react`, `@/components/StatusScreen`, `@/lib/themes`,
 * `@/store/uiSlice`.
 *
 * @example
 * ```tsx
 * // Rendered by Next.js — no call site.
 * ```
 */
export default function NotFound() {
  const themeKey = useSelector(selectTheme);
  const T = THEMES[themeKey] ?? THEMES.ocean;
  const pathname = usePathname();

  return (
    <StatusScreen
      testId="not-found"
      T={T}
      code="404"
      title="No route matched"
      description="This URL does not belong to Bulky API. Your collections, environments and scripts are untouched — head back to the workspace to keep going."
      meta={pathname}
    >
      <button
        type="button"
        onClick={() => history.back()}
        data-testid="not-found-back-button"
        className={STATUS_ACTION_GHOST}
      >
        <ArrowLeft size={13} aria-hidden="true" />
        Back
      </button>
      <Link
        href="/"
        data-testid="not-found-home-link"
        className={STATUS_ACTION}
      >
        <Home size={13} aria-hidden="true" />
        Workspace
      </Link>
    </StatusScreen>
  );
}
