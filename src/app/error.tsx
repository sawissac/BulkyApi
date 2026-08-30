"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { Home, RotateCcw } from "lucide-react";
import { THEMES } from "@/lib/themes";
import { selectTheme } from "@/store/uiSlice";
import StatusScreen, {
  STATUS_ACTION,
  STATUS_ACTION_GHOST,
} from "@/components/StatusScreen";

type Props = {
  /** The thrown error. `digest` is the only field populated for a server error
   *  in production — the message is redacted there. */
  error: Error & { digest?: string };
  /** Re-fetches and re-renders the segment. Preferred over `reset`; passed by
   *  Next 16.2 and up. */
  unstable_retry?: () => void;
  /** Clears the error state and re-renders without re-fetching. The fallback
   *  when a Next version predates `unstable_retry`. */
  reset: () => void;
};

/**
 * Fallback for an uncaught error thrown while rendering a route.
 *
 * @remarks
 * Status: stable — Type: route screen
 *
 * State & behavior: no local state. One effect logs the error to the console
 * once per distinct error, which is the only report channel this app has. Try
 * again calls `unstable_retry` when Next provides it and falls back to `reset`,
 * the difference being whether the segment re-fetches or only re-renders.
 *
 * Variants: none — the tone is always `error`.
 *
 * Composition: {@link StatusScreen} carrying the error message as its detail
 * block and the digest beneath it, with Try again and a link to the workspace.
 *
 * Accessibility: the screen is a `role="alert"` region, so the failure is
 * announced rather than silently swapped in.
 *
 * Test ids: `error-page-retry-button`, `error-page-home-link`; the screen
 * itself carries the `error-page-*` ids {@link StatusScreen} derives.
 *
 * CSS classes: none — the shared action recipes over `app-*` theme tokens.
 *
 * Edge cases: a production server error arrives with its message redacted; the
 * detail block then shows a generic line and the digest is what identifies the
 * failure in logs. This boundary does not cover the root layout — that is
 * {@link GlobalError}'s job.
 *
 * Dependencies: `next/link`, `react-redux`, `lucide-react`,
 * `@/components/StatusScreen`, `@/lib/themes`, `@/store/uiSlice`.
 *
 * @example
 * ```tsx
 * // Rendered by Next.js — no call site.
 * ```
 */
export default function ErrorPage({ error, unstable_retry, reset }: Props) {
  const themeKey = useSelector(selectTheme);
  const T = THEMES[themeKey] ?? THEMES.ocean;

  useEffect(() => {
    console.error(error);
  }, [error]);

  const retry = unstable_retry ?? reset;

  return (
    <StatusScreen
      testId="error-page"
      T={T}
      tone="error"
      code="500"
      title="Something broke while rendering"
      description="The workspace hit an unrecoverable error. Retrying re-runs the failed part — your saved collections and environments are not affected."
      meta="runtime error"
      detail={error.message || "No message was attached to this error."}
      digest={error.digest}
    >
      <Link href="/" data-testid="error-page-home-link" className={STATUS_ACTION_GHOST}>
        <Home size={13} aria-hidden="true" />
        Workspace
      </Link>
      <button
        type="button"
        onClick={() => retry()}
        data-testid="error-page-retry-button"
        className={STATUS_ACTION}
      >
        <RotateCcw size={13} aria-hidden="true" />
        Try again
      </button>
    </StatusScreen>
  );
}
