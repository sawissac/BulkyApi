"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Check,
  Clock,
  Form,
  PanelLeftRightDashed,
  TvMinimal,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { THEMES, type Theme, type ThemeKey } from "@/lib/themes";
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
  { id: "light", label: "Chocolate" },
  { id: "purple", label: "Amethyst" },
  { id: "green", label: "Nature" },
  { id: "rose", label: "Rose" },
  { id: "amber", label: "Amber" },
  { id: "slate", label: "Slate" },
  { id: "flat", label: "Sunset" },
  { id: "coffee", label: "Coffee" },
];

const LAYOUT_OPTIONS: Array<{
  id: LayoutKey;
  label: string;
  detail: string;
  Icon: React.ElementType;
}> = [
  {
    id: "balanced",
    label: "Balanced",
    detail: "Sidebar, editor and response split evenly.",
    Icon: PanelLeftRightDashed,
  },
  {
    id: "editor-focus",
    label: "Editor Focus",
    detail: "Editor takes most of the width; sidebar and response narrow.",
    Icon: TvMinimal,
  },
  {
    id: "response-focus",
    label: "Response Focus",
    detail: "Response panel expands; editor narrows, sidebar stays slim.",
    Icon: Form,
  },
];

/**
 * Segmented-group tile for a theme choice — color block on top, name below.
 * Carries a radius only on whichever of its own corners lands on the group's
 * own outer corner (rather than relying on the parent grid's
 * `overflow-hidden` to clip a square corner to its rounded edge, which some
 * renderers do not do reliably for an inset shadow), via `THEME_CORNER_CLASS`.
 * An interior tile — one that doesn't touch an outer edge of the grid — stays
 * square on all four corners, so a selected interior tile reads as a flush
 * cell rather than a floating rounded card. Sits in a `gap-px` grid whose
 * background shows through the gaps as the divider lines between tiles.
 */
const SWATCH_BTN =
  "group relative flex flex-col items-center gap-1.5 bg-app-hover p-1.5 " +
  "transition-colors duration-200 hover:bg-app-selected " +
  "focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-0 " +
  "data-active:bg-app-accent-faint data-active:shadow-[inset_0_0_0_1.5px_var(--app-accent)]";

/**
 * Corner-rounding class per theme tile index, hand-mapped to the exact grid
 * this builds: 10 tiles on `grid-cols-3` below `sm` (3 full rows plus a
 * trailing row holding only tile 9, so the two empty cells beside it need no
 * tile rounding — the parent's own clip handles them), `grid-cols-5` at `sm`
 * and up (10 tiles fills exactly 2 full rows). Tile 9 sits bottom-left on
 * mobile but bottom-right at `sm`, so it carries both and cancels the
 * mobile one there. A tile only rounds where it actually sits on one of the
 * grid's four outer corners at a given breakpoint, so an interior tile stays
 * square. Adding, removing, or reordering a theme requires redoing this by hand.
 */
const THEME_CORNER_CLASS: Record<number, string> = {
  0: "rounded-tl-md",
  2: "rounded-tr-md sm:rounded-tr-none",
  4: "sm:rounded-tr-md",
  5: "sm:rounded-bl-md",
  9: "rounded-bl-md sm:rounded-bl-none sm:rounded-br-md",
};

/**
 * Segmented-group row for a layout choice — icon, name, detail, check.
 * Rounds only `first:rounded-t-md last:rounded-b-md`, matching whichever
 * corners the group container itself rounds — same reasoning as
 * {@link SWATCH_BTN}'s `THEME_CORNER_CLASS`, simplified because a 1-column
 * `divide-y` stack only ever has two outer corners to account for. An
 * interior row stays square. Sits in a `divide-y` stack whose divider lines
 * stand in for individual borders, so adjacent rows still read as one
 * control.
 */
const ROW_BTN =
  "group relative flex w-full items-center gap-3 bg-app-hover px-3 py-2.5 text-left first:rounded-t-md last:rounded-b-md " +
  "transition-colors duration-200 hover:bg-app-selected " +
  "focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-0 " +
  "data-active:bg-app-accent-faint data-active:shadow-[inset_0_0_0_1.5px_var(--app-accent)]";

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
 * Variants: none of its own — the theme grid and layout list each render one
 * selected option among their choices, marked by `data-active` and
 * `aria-pressed`. Theme is a grid of square tiles, each filled with a diagonal
 * gradient from that theme's actual accent color (`Theme.cyan`) into a darker
 * `color-mix` shade of the same color, so the choice previews before it is
 * applied; the selected tile gets a `Check` badge over the swatch. This is
 * the one deliberate exception to the flat "no gradients" rule in `@/lib/ui`
 * — scoped to this decorative swatch only. Layout
 * is a stacked list of full-width rows, each carrying a lucide icon
 * (`PanelLeftRightDashed`/`LaptopMinimal`/`Form`), a name, and a one-line
 * description of the resulting pane split; the selected row gets a trailing
 * `Check`. Both the theme grid and the layout list read as one segmented
 * button group rather than loose items: the group container's own outer
 * `border`+`rounded-lg` plus `gap-px`/`divide-y` (colored `app-border`) draws
 * the frame and the hairlines between members. Each theme tile rounds only
 * the corner(s) it actually shares with the group's own outer corner, via
 * `THEME_CORNER_CLASS` — this does not depend on the parent's
 * `overflow-hidden` clipping a member's square corner down to the parent's
 * rounded edge, which some renderers do unreliably for an inset `box-shadow`;
 * a corner tile relying on that clip alone would show a square nub poking
 * past the curve, and an interior tile rounded unconditionally would read as
 * a floating rounded card instead of a flush grid cell. Layout rows round
 * only `first:rounded-t-md last:rounded-b-md` for the same reason, simplified
 * because a `divide-y` stack only ever has two outer corners. Each tile/row carries a faded
 * `bg-app-hover` fill so the group reads as one solid control block; hover
 * swaps that fill to `bg-app-selected` and the active member gets
 * `bg-app-accent-faint` plus the inset ring. Call Timeout stays a plain row
 * below a `border-t` divider since it is a single control, not a group.
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
 * pills `tweaks-panel-theme-button-<theme-id>`, theme swatch dots
 * `tweaks-panel-theme-swatch-<theme-id>`, layout pills
 * `tweaks-panel-layout-button-<layout-id>`, timeout input
 * `tweaks-panel-timeout-input`, timeout clear
 * `tweaks-panel-timeout-input-clear-button`, footer `tweaks-panel-done-button`.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases:
 * - Clearing the timeout field or pressing "clear" both resolve to `0`
 *   (no limit), not `undefined`.
 * - A non-numeric paste is coerced to `0` on the trailing dispatch, though the
 *   field itself keeps whatever text was typed until then.
 *
 * Dependencies: `lucide-react`, `react-redux`, shared recipes from `@/lib/ui`,
 * `@/components/ui/input` ({@link Input}).
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
        aria-label="Settings"
        data-testid="tweaks-panel-root"
        className="flex w-[min(560px,92vw)] animate-[fadeUp_0.18s_ease] flex-col overflow-hidden rounded-lg border-2 border-app-border-mid bg-app-panel"
      >
        <div className="flex shrink-0 items-center gap-2 border-b-2 border-app-border-mid px-5 py-3">
          <span className="flex-1 font-title text-[13px] font-semibold uppercase tracking-[0.04em] text-app-bright">
            Settings
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close settings"
            data-testid="tweaks-panel-close-button"
            className={ui.iconBtn}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <div>
            <div className={`${ui.label} mb-2`}>Color Theme</div>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-app-border bg-app-border sm:grid-cols-5">
              {THEME_OPTIONS.map(({ id, label }, index) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => dispatch(setTheme(id))}
                  aria-pressed={theme === id}
                  data-active={theme === id || undefined}
                  data-testid={`tweaks-panel-theme-button-${id}`}
                  className={`${SWATCH_BTN} ${THEME_CORNER_CLASS[index] ?? ""}`}
                >
                  <span className="relative block h-9 w-full shrink-0 overflow-hidden rounded-sm border border-black/15">
                    <span
                      aria-hidden="true"
                      data-testid={`tweaks-panel-theme-swatch-${id}`}
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${THEMES[id].cyan}, color-mix(in srgb, ${THEMES[id].cyan} 55%, black))`,
                      }}
                    />
                    {theme === id && (
                      <Check
                        size={13}
                        aria-hidden="true"
                        className="absolute right-0.5 top-0.5 rounded-full bg-black/40 p-0.5 text-white"
                      />
                    )}
                  </span>
                  <span className="font-title text-[10px] font-semibold uppercase tracking-[0.06em] text-app-dim group-data-active:text-app-accent">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className={`${ui.label} mb-2`}>Layout</div>
            <div className="flex flex-col divide-y divide-app-border overflow-hidden rounded-lg border border-app-border">
              {LAYOUT_OPTIONS.map(({ id, label, detail, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => dispatch(setLayout(id))}
                  aria-pressed={layout === id}
                  data-active={layout === id || undefined}
                  data-testid={`tweaks-panel-layout-button-${id}`}
                  className={ROW_BTN}
                >
                  <Icon
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-app-dim group-data-active:text-app-accent"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-title text-[11px] font-semibold uppercase tracking-[0.06em] text-app-bright">
                      {label}
                    </span>
                    <span className="mt-0.5 block font-description text-[11px] leading-snug text-app-dim">
                      {detail}
                    </span>
                  </span>
                  {layout === id && (
                    <Check
                      size={14}
                      aria-hidden="true"
                      className="shrink-0 text-app-accent"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-app-border pt-4">
            <div
              id="tweaks-panel-timeout-label"
              className={`${ui.label} mb-2.5`}
            >
              Call Timeout
            </div>
            <div className="flex items-center gap-2">
              <Input
                icon={Clock}
                type="number"
                min={0}
                step={500}
                value={localTimeout}
                onChange={(e) => handleTimeoutChange(e.target.value)}
                onClear={() => {
                  setLocalTimeout("");
                  dispatch(setCallTimeout(0));
                }}
                placeholder="Enter timeout in ms…"
                aria-labelledby="tweaks-panel-timeout-label"
                data-testid="tweaks-panel-timeout-input"
                className="font-mono"
              />
              <span className={ui.meta}>ms</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end border-t-2 border-app-border-mid px-5 py-3">
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
