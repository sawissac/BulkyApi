"use client";

import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import {
  Braces,
  Files,
  FolderOpen,
  Globe,
  Laptop,
  SlidersHorizontal,
} from "lucide-react";
import { useDisplayMode } from "@/hooks/useDisplayMode";
import DisplayModeDialog from "./DisplayModeDialog";
import {
  selectSidebarTab,
  setSidebarTab,
  selectTweaksOpen,
  setTweaksOpen,
  type SidebarTab,
} from "@/store/uiSlice";
import { selectActiveEnv } from "@/store/collectionsSlice";
import {
  selectBuiltCalls,
  selectRunning,
  selectPaused,
} from "@/store/runnerSlice";

/**
 * Rail control: 36px square hit area, flat, accent tint when active. The
 * `before` bar is the selected marker — it grows from zero height so switching
 * tabs animates without shifting the icon.
 */
const RAIL_BTN =
  "relative flex size-9 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-app-dim " +
  "transition-colors duration-200 hover:bg-app-hover hover:text-app-accent " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-inset " +
  "data-active:bg-app-selected data-active:text-app-accent " +
  "before:absolute before:left-0 before:top-1/2 before:h-0 before:w-[2px] before:-translate-y-1/2 before:rounded-full " +
  "before:bg-app-accent before:transition-all before:duration-200 data-active:before:h-5";

const TABS: Array<{ id: SidebarTab; label: string; Icon: React.ElementType }> = [
  { id: "collections", label: "Tests", Icon: Files },
  { id: "env", label: "Envs", Icon: Globe },
  { id: "vars", label: "Vars", Icon: Braces },
  { id: "file", label: "File", Icon: FolderOpen },
];

/**
 * Fixed 48px vertical rail pinned to the window's left edge: brand mark, active
 * environment, the sidebar section tabs, and the app-level controls (run status,
 * call count, fullscreen, tweaks). It replaces the former full-width top bar, so
 * the three resizable panes start at the top of the viewport. Reach for
 * {@link Sidebar} for the pane body the tabs here select.
 *
 * @remarks
 * Status: stable — Type: layout chrome
 *
 * State & behavior: one piece of local state — whether the display-mode picker
 * is open. The selected tab and tweaks-panel flag live in `uiSlice`; run status,
 * pause flag and call count come from `runnerSlice`; the environment badge reads
 * `collectionsSlice`. The laptop control opens {@link DisplayModeDialog}, which
 * changes nothing until the user confirms; the confirmed choice goes to
 * `useDisplayMode`, which enters or leaves fullscreen there and then. The running
 * badge only mounts while a script runs.
 *
 * Variants:
 * - idle — no status dot, call count reflects the last analysis.
 * - running — pulsing accent dot.
 * - paused — same dot, warn color, animation stopped.
 *
 * Composition: renders no children. Pairs with {@link Sidebar}, whose tab panel
 * carries `id="sidebar-pane"` — the target of `aria-controls` here.
 *
 * Accessibility: the rail is a `nav` labelled "Primary". Tabs form a vertical
 * `tablist`; each icon-only control carries an `aria-label`, since no visible
 * text names it. The tweaks button reports `aria-expanded`; the display control
 * reports `aria-haspopup="dialog"` plus `aria-expanded`. Run status is a polite
 * live region.
 *
 * Test ids: root `activity-rail-nav`, env button `activity-rail-env-button`,
 * tabs `activity-rail-tab-<tab-id>`, status `activity-rail-status`, call count
 * `activity-rail-call-count`, display mode `activity-rail-display-button`,
 * tweaks `activity-rail-tweaks-button`.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases:
 * - No active environment → the badge shows an em dash and still switches to
 *   the Envs tab.
 * - Long environment names truncate to the 48px rail; the full name stays in
 *   the button's `title`.
 * - Every reload comes up in URL view; fullscreen is never restored on its own,
 *   so the laptop control always starts out showing URL view.
 *
 * Dependencies: `lucide-react`, `react-redux`, internal `useDisplayMode` hook.
 *
 * @example
 * ```tsx
 * <div className="flex min-h-0 flex-1">
 *   <ActivityRail />
 *   <Sidebar T={T} />
 * </div>
 * ```
 *
 * @see {@link Sidebar}
 * @see {@link DisplayModeDialog}
 */
export default function ActivityRail() {
  const dispatch = useDispatch();
  const tab = useSelector(selectSidebarTab);
  const tweaksOpen = useSelector(selectTweaksOpen);
  const activeEnv = useSelector(selectActiveEnv);
  const builtCalls = useSelector(selectBuiltCalls);
  const running = useSelector(selectRunning);
  const paused = useSelector(selectPaused);
  const { mode, isFullscreen, apply } = useDisplayMode();
  const [pickerOpen, setPickerOpen] = useState(false);

  const modeLabel = isFullscreen ? "Fullscreen view" : "URL view";

  return (
    <nav
      aria-label="Primary"
      data-testid="activity-rail-nav"
      className="flex h-full w-12 shrink-0 flex-col items-center gap-1 border-r border-app-border bg-app-sidebar py-2"
    >
      <img
        src="/favicon.svg"
        alt="Bulky API"
        title="Bulky API"
        width={24}
        height={24}
        className="shrink-0 rounded-md"
      />

      <button
        type="button"
        onClick={() => dispatch(setSidebarTab("env"))}
        title={`Active environment: ${activeEnv?.name ?? "none"}`}
        aria-label={`Active environment: ${activeEnv?.name ?? "none"}`}
        data-testid="activity-rail-env-button"
        className="mt-1 w-9 truncate rounded-md border-0 bg-app-hover px-1 py-1 text-center font-mono text-[10px] leading-none text-app-dim transition-colors duration-200 hover:bg-app-selected hover:text-app-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-inset"
      >
        {activeEnv?.name ?? "—"}
      </button>

      <div className="my-1.5 h-px w-6 bg-app-border-mid" aria-hidden="true" />

      <div
        role="tablist"
        aria-orientation="vertical"
        aria-label="Sidebar sections"
        className="flex flex-col items-center gap-1"
      >
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls="sidebar-pane"
            aria-label={label}
            title={label}
            onClick={() => dispatch(setSidebarTab(id))}
            data-active={tab === id || undefined}
            data-testid={`activity-rail-tab-${id}`}
            className={RAIL_BTN}
          >
            <Icon size={16} aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {running && (
        <div
          role="status"
          aria-live="polite"
          aria-label={paused ? "Paused" : "Running"}
          title={paused ? "Paused" : "Running"}
          data-testid="activity-rail-status"
          className="flex size-9 shrink-0 items-center justify-center"
        >
          <span
            aria-hidden="true"
            data-paused={paused || undefined}
            className="size-2 animate-[pulse_0.7s_ease-in-out_infinite] rounded-full bg-app-accent data-paused:animate-none data-paused:bg-app-warn"
          />
        </div>
      )}

      <div
        title={`${builtCalls.length} ${builtCalls.length === 1 ? "call" : "calls"}`}
        data-testid="activity-rail-call-count"
        className="flex w-9 shrink-0 flex-col items-center leading-none"
      >
        <span className="font-mono text-[12px] text-app-text">
          {builtCalls.length}
        </span>
        <span className="text-[8px] font-semibold uppercase tracking-[0.1em] text-app-dim">
          {builtCalls.length === 1 ? "call" : "calls"}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        title={`Display mode: ${modeLabel}`}
        aria-label={`Display mode: ${modeLabel}. Choose how the app fills the screen`}
        aria-haspopup="dialog"
        aria-expanded={pickerOpen}
        data-active={pickerOpen || undefined}
        data-testid="activity-rail-display-button"
        className={`mt-1 ${RAIL_BTN}`}
      >
        <Laptop size={15} />
      </button>

      <button
        type="button"
        onClick={() => dispatch(setTweaksOpen(!tweaksOpen))}
        title="Tweaks: theme, layout and call timeout"
        aria-label="Tweaks: theme, layout and call timeout"
        aria-expanded={tweaksOpen}
        data-active={tweaksOpen || undefined}
        data-testid="activity-rail-tweaks-button"
        className={RAIL_BTN}
      >
        <SlidersHorizontal size={15} />
      </button>

      {pickerOpen && (
        <DisplayModeDialog
          mode={mode}
          onConfirm={(next) => {
            void apply(next);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </nav>
  );
}
