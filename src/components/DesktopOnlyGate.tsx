import { MonitorSmartphone } from "lucide-react";

type Props = {
  /** App content, mounted at every viewport size but only painted at `lg`
   *  (≥1024px) and up — see Edge cases. */
  children: React.ReactNode;
};

/**
 * Blocks the app below the `lg` breakpoint with a "desktop only" message
 * instead of rendering the real layout, which assumes room for sidebar,
 * editor and response panel side by side.
 *
 * @remarks
 * Status: stable — Type: layout gate
 *
 * State & behavior: no JS, no `matchMedia` — both branches are always
 * mounted and Tailwind's `lg:` media query toggles which one paints, so
 * there is no hydration flash and no resize listener to clean up.
 *
 * Variants: none.
 *
 * Composition: wraps `children` (the real app) and renders a sibling notice
 * card; exactly one of the two is visible at any viewport width.
 *
 * Accessibility: the notice is a `role="alert"` region labelled by its
 * title, matching `StatusScreen`'s pattern for full-screen states.
 *
 * Test ids: `desktop-only-gate` on the notice card.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens,
 * which fall back to the default `ocean` palette set on `:root` so the
 * notice renders correctly even before the store hydrates a theme.
 *
 * Edge cases: `children` stays mounted under `hidden lg:contents` while the
 * notice shows, so app state (Redux, persistence hydration) keeps running
 * underneath rather than being torn down and restarted once the viewport
 * grows past `lg`.
 *
 * Dependencies: `lucide-react` (`MonitorSmartphone`).
 *
 * @example
 * ```tsx
 * <DesktopOnlyGate>
 *   <Providers>{children}</Providers>
 * </DesktopOnlyGate>
 * ```
 */
export default function DesktopOnlyGate({ children }: Props) {
  return (
    <>
      <div className="hidden h-full lg:contents">{children}</div>
      <div
        role="alert"
        aria-labelledby="desktop-only-gate-title"
        data-testid="desktop-only-gate"
        className="flex h-full w-full items-center justify-center bg-app-bg p-6 font-sans text-app-text lg:hidden"
      >
        <div className="flex w-[min(360px,100%)] flex-col items-center gap-3 rounded-lg border-2 border-app-border-mid bg-app-panel px-6 py-8 text-center">
          <MonitorSmartphone
            className="h-8 w-8 text-app-accent"
            aria-hidden="true"
            strokeWidth={1.5}
          />
          <h1
            id="desktop-only-gate-title"
            className="font-title text-[15px] font-semibold tracking-[-0.01em] text-app-bright"
          >
            Desktop Only
          </h1>
          <p className="font-description text-[12px] leading-relaxed text-app-dim">
            Bulky API is built for desktop and laptop screens. Open it on a
            larger display to use the editor and response panel.
          </p>
        </div>
      </div>
    </>
  );
}
