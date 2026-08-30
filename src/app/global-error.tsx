"use client";

import { useEffect, useState } from "react";
import { RotateCcw, RefreshCw } from "lucide-react";
import "./globals.css";
import { THEMES, type Theme, type ThemeKey } from "@/lib/themes";
import StatusScreen, {
  STATUS_ACTION,
  STATUS_ACTION_GHOST,
} from "@/components/StatusScreen";

type Props = {
  /** The thrown error. `digest` identifies it in server logs when the message
   *  is redacted. */
  error: Error & { digest?: string };
  /** Re-fetches and re-renders below the boundary. Passed by Next 16.2 and up. */
  unstable_retry?: () => void;
  /** Clears the error state without re-fetching — the fallback path. */
  reset: () => void;
};

/**
 * Last-resort screen for an error thrown by the root layout itself, replacing
 * it — and with it the providers, the store and every other page shell.
 *
 * @remarks
 * Status: stable — Type: route screen
 *
 * State & behavior: `T` starts undefined, so the first paint uses the `:root`
 * fallback palette; an effect then imports the persistence module lazily and
 * reads the saved theme out of the local cache, repainting in it when one is
 * found. Both the import and the read are guarded — this screen is what shows
 * when everything else failed, so it must not throw on its own. The retry
 * prefers `unstable_retry`, falling back to `reset`.
 *
 * Variants: none — the tone is always `error`.
 *
 * Composition: renders its own `<html>` and `<body>` (the root layout is gone
 * at this point) and imports the global stylesheet itself, then a
 * {@link StatusScreen} with Reload and Try again.
 *
 * Accessibility: `<title>` is set through React, since a client error boundary
 * cannot export metadata. The card is a `role="alert"` region.
 *
 * Test ids: `global-error-retry-button`, `global-error-reload-button`; the
 * screen carries the `global-error-*` ids {@link StatusScreen} derives.
 *
 * CSS classes: none — the shared action recipes over `app-*` theme tokens.
 *
 * Edge cases: with no local cache — a first visit, or storage the browser
 * blocked — the default palette stays. The store is unavailable here by
 * definition, which is why the theme is read from storage rather than Redux.
 *
 * Dependencies: `lucide-react`, `@/components/StatusScreen`, `@/lib/themes`,
 * `@/lib/persist` (lazily), `./globals.css`.
 *
 * @example
 * ```tsx
 * // Rendered by Next.js — no call site.
 * ```
 */
export default function GlobalError({
  error,
  unstable_retry,
  reset,
}: Props) {
  const [T, setT] = useState<Theme | undefined>(undefined);

  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    let cancelled = false;
    import("@/lib/persist")
      .then(({ loadPersistedState }) => loadPersistedState())
      .then((saved) => {
        if (cancelled) return;
        const key = (saved?.ui as { theme?: ThemeKey } | undefined)?.theme;
        if (key && THEMES[key]) setT(THEMES[key]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const retry = unstable_retry ?? reset;

  return (
    <html lang="en" style={{ height: "100%" }} suppressHydrationWarning>
      <body style={{ height: "100%", margin: 0 }} suppressHydrationWarning>
        <title>Bulky API — Error</title>
        <StatusScreen
          testId="global-error"
          T={T}
          tone="error"
          code="500"
          title="The app failed to start"
          description="Bulky API could not mount its shell, so nothing below it rendered. Reloading clears the failed boot; if it keeps happening, the digest below identifies this crash."
          meta="fatal error"
          detail={error.message || "No message was attached to this error."}
          digest={error.digest}
        >
          <button
            type="button"
            onClick={() => location.reload()}
            data-testid="global-error-reload-button"
            className={STATUS_ACTION_GHOST}
          >
            <RefreshCw size={13} aria-hidden="true" />
            Reload
          </button>
          <button
            type="button"
            onClick={() => retry()}
            data-testid="global-error-retry-button"
            className={STATUS_ACTION}
          >
            <RotateCcw size={13} aria-hidden="true" />
            Try again
          </button>
        </StatusScreen>
      </body>
    </html>
  );
}
