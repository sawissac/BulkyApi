"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X } from "lucide-react";
import type { Theme, ThemeKey } from "@/lib/themes";
import type { LayoutKey } from "@/store/uiSlice";
import {
  selectTheme,
  selectLayout,
  setTheme,
  setLayout,
  setTweaksOpen,
  selectCallTimeout,
  setCallTimeout,
} from "@/store/uiSlice";
import * as ui from "@/lib/ui";

const THEME_OPTIONS: Array<{ id: ThemeKey; label: string }> = [
  { id: "midnight", label: "Midnight" },
  { id: "ocean", label: "Ocean" },
  { id: "light", label: "Light" },
  { id: "purple", label: "Purple" },
  { id: "green", label: "Green" },
  { id: "rose", label: "Rose" },
  { id: "amber", label: "Amber" },
  { id: "slate", label: "Slate" },
  { id: "flat", label: "Flat" },
];

const LAYOUT_OPTIONS: Array<{ id: LayoutKey; label: string }> = [
  { id: "balanced", label: "Balanced" },
  { id: "editor-focus", label: "Editor Focus" },
  { id: "response-focus", label: "Response Focus" },
];

/** Pill toggle for a segmented choice — theme or layout. Every state (rest,
 *  hover, keyboard focus, selected) is a border/fill/text change, no shadow. */
const PILL_BTN =
  "flex h-8 shrink-0 items-center rounded-full border border-app-border bg-transparent px-3 " +
  "text-[11px] font-semibold uppercase tracking-[0.07em] text-app-dim transition-colors duration-200 " +
  "hover:border-app-border-accent hover:bg-app-selected hover:text-app-accent " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel " +
  "data-active:border-app-border-accent data-active:bg-app-accent-faint data-active:text-app-accent";

/**
 * Modal for the settings that reshape the whole app rather than one call:
 * color theme, layout preset, and the per-call timeout. Every change applies
 * immediately — there is no draft or Cancel, unlike {@link DisplayModeDialog} —
 * so the pill grid doubles as a live preview of whatever the user is pointing
 * at. Rendered by {@link ActivityRail} when the tweaks control is pressed.
 *
 * @remarks
 * Status: stable — Type: overlay
 *
 * State & behavior: local state is only the call-timeout text field, kept
 * separate from the store so typing does not stutter waiting on the 400ms
 * debounce before `setCallTimeout` dispatches. Theme and layout pills dispatch
 * on click with no debounce. Escape and a click on the scrim close the dialog
 * by dispatching `setTweaksOpen(false)`; so does the footer's Done button.
 * Focus moves to the close button on mount.
 *
 * Variants: none of its own — the theme and layout sections each render one
 * selected pill among their options, marked by `data-active` and `aria-pressed`.
 *
 * Composition: renders no children. Reads `T` as an accepted prop only to keep
 * its signature consistent with the other panels {@link ActivityRail} composes
 * ({@link Sidebar}, {@link CollPane}); styling comes entirely from the `app-*`
 * theme tokens already mirrored onto `<html>`, not from `T` directly.
 *
 * Accessibility: `role="dialog"` with `aria-modal` and a label. Pills carry
 * `aria-pressed` for their selected state. The timeout field is labelled by
 * the visible "Call Timeout" heading via `aria-labelledby`.
 *
 * Test ids: root `tweaks-panel-root`, close `tweaks-panel-close-button`, theme
 * pills `tweaks-panel-theme-button-<theme-id>`, layout pills
 * `tweaks-panel-layout-button-<layout-id>`, timeout input
 * `tweaks-panel-timeout-input`, timeout clear `tweaks-panel-timeout-clear-button`,
 * footer `tweaks-panel-done-button`.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases:
 * - Clearing the timeout field or pressing "clear" both resolve to `0`
 *   (no limit), not `undefined`.
 * - A non-numeric paste is coerced to `0` on the trailing dispatch, though the
 *   field itself keeps whatever text was typed until then.
 *
 * Dependencies: `lucide-react`, `react-redux`, shared recipes from `@/lib/ui`.
 *
 * @example
 * ```tsx
 * {tweaksOpen && <TweaksPanel T={T} />}
 * ```
 *
 * @see {@link ActivityRail}
 * @see {@link DisplayModeDialog}
 */
export default function TweaksPanel({}: TweaksPanelProps) {
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);
  const layout = useSelector(selectLayout);
  const callTimeout = useSelector(selectCallTimeout);

  const [localTimeout, setLocalTimeout] = useState(
    callTimeout > 0 ? String(callTimeout) : "",
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = () => dispatch(setTweaksOpen(false));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const handleTimeoutChange = (val: string) => {
    setLocalTimeout(val);
    clearTimeout(timeoutRef.current ?? undefined);
    timeoutRef.current = setTimeout(() => {
      dispatch(setCallTimeout(Math.max(0, val === "" ? 0 : Number(val))));
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/65 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tweaks"
        data-testid="tweaks-panel-root"
        className="flex w-[min(420px,92vw)] animate-[fadeUp_0.18s_ease] flex-col overflow-hidden rounded-lg border-2 border-app-border-mid bg-app-panel"
      >
        <div className="flex shrink-0 items-center gap-2.5 border-b border-app-border px-5 py-3.5">
          <span className="flex-1 text-[15px] font-bold tracking-[-0.01em] text-app-bright">
            Tweaks
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close tweaks"
            data-testid="tweaks-panel-close-button"
            className={ui.iconBtn}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <div>
            <div className={`${ui.label} mb-2`}>Color Theme</div>
            <div className="flex flex-wrap gap-2">
              {THEME_OPTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => dispatch(setTheme(id))}
                  aria-pressed={theme === id}
                  data-active={theme === id || undefined}
                  data-testid={`tweaks-panel-theme-button-${id}`}
                  className={PILL_BTN}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className={`${ui.label} mb-2`}>Layout</div>
            <div className="flex flex-wrap gap-2">
              {LAYOUT_OPTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => dispatch(setLayout(id))}
                  aria-pressed={layout === id}
                  data-active={layout === id || undefined}
                  data-testid={`tweaks-panel-layout-button-${id}`}
                  className={PILL_BTN}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div id="tweaks-panel-timeout-label" className={`${ui.label} mb-2`}>
              Call Timeout
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={500}
                value={localTimeout}
                onChange={(e) => handleTimeoutChange(e.target.value)}
                placeholder="∞ no limit"
                aria-labelledby="tweaks-panel-timeout-label"
                data-testid="tweaks-panel-timeout-input"
                className={`${ui.input} font-mono`}
              />
              <span className={ui.meta}>ms</span>
            </div>
            {callTimeout > 0 && (
              <button
                type="button"
                onClick={() => {
                  setLocalTimeout("");
                  dispatch(setCallTimeout(0));
                }}
                data-testid="tweaks-panel-timeout-clear-button"
                className="mt-2 rounded-sm border-0 bg-transparent p-0 text-[11px] font-semibold uppercase tracking-[0.07em] text-app-dim transition-colors duration-200 hover:text-app-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end border-t border-app-border px-5 py-3">
          <button
            type="button"
            onClick={close}
            data-testid="tweaks-panel-done-button"
            className={ui.solidBtn}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export type TweaksPanelProps = {
  /** Active theme. Accepted only for signature parity with sibling panels; the
   *  dialog styles itself from the `app-*` tokens `T` already publishes. */
  T: Theme;
};
