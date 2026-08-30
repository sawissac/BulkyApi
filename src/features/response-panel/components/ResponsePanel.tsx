"use client";

import { useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  ChevronUp,
  ChevronDown,
  ArrowUpFromLine,
  ListTodo,
  ChartGantt,
  BookCheck,
  Footprints,
} from "lucide-react";
import type { Theme } from "@/lib/themes";
import * as ui from "@/lib/ui";
import {
  selectBuiltCalls,
  selectLogs,
  selectExtractedVars,
  selectAssertions,
} from "@/store/runnerSlice";
import {
  selectResponseView,
  setResponseView,
  setResponseViewForItem,
} from "@/store/uiSlice";
import { selectActiveId } from "@/store/collectionsSlice";
import { selectActiveEnv, setVar } from "@/store/collectionsSlice";
import { statusColor } from "@/lib/themes";
import CallCard from "./CallCard";
import ApiWaterfall from "./ApiWaterfall";
import ApiDocs from "./ApiDocs";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Section strip above a group — same geometry as every sidebar pane header. */
const HEADER = "flex shrink-0 items-center gap-2 px-2.5 py-1";

/** Container that visually combines a `ButtonGroup`'s children, no border. */
const GROUP_BOX = "rounded-md overflow-hidden";

/** Ghost button hover matching the rest of the app's icon controls. */
const GROUP_BTN =
  "rounded-none hover:bg-app-hover hover:text-app-accent dark:hover:bg-app-hover";

/** View-toggle button: `GROUP_BTN` plus the selected tint the sidebar rows use. */
const VIEW_BTN = `${GROUP_BTN} data-active:bg-app-selected data-active:text-app-accent`;

/** Step toggle: ghost at rest, tints warn once armed. */
const STEP_BTN = `${GROUP_BTN} rounded-md data-active:bg-app-warn/15 data-active:text-app-warn disabled:pointer-events-none disabled:opacity-50`;

/** List container: one bordered card, corner rows clipped to its radius by
 *  `overflow-hidden`, rows divided by `divide-y` instead of each row owning its
 *  own border — the same recipe as `CollPane`/`VarsPane` in the left pane. */
const LIST =
  "mx-2 mb-2 flex flex-col overflow-hidden rounded-md border border-app-border divide-y divide-app-border";

/** Row block flush edge-to-edge inside `LIST`, matching `VarsPane`'s row. */
const ROW =
  "group flex items-center gap-1.5 bg-app-hover px-2.5 py-1.5 transition-colors duration-200 hover:bg-app-selected";

/** Compact bordered label button — `ui.ghostBtn` trimmed to fit a table row. */
const PROMOTE_BTN =
  "flex shrink-0 items-center rounded-md border border-app-border bg-transparent px-1.5 py-0.5 " +
  "font-title text-[10px] font-semibold uppercase tracking-[0.07em] text-app-dim transition-colors duration-200 " +
  "hover:border-app-border-accent hover:bg-app-selected hover:text-app-accent " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent";

const LOG_TONE = {
  error: "text-app-error",
  warn: "text-app-warn",
} as const;

/** Drag-resize bounds for the console panel, in px. */
const CONSOLE_MIN = 64;
const CONSOLE_MAX = 560;
const CONSOLE_DEFAULT = 150;

/** Level-chip tint per log level; anything unlisted falls back to `log`. */
const LEVEL_CHIP = {
  log: "bg-app-border/60 text-app-dim",
  info: "bg-app-accent/15 text-app-accent",
  warn: "bg-app-warn/15 text-app-warn",
  error: "bg-app-error/15 text-app-error",
} as const;

/**
 * Inline token colors for highlighted log text. The light set swaps in darker
 * equivalents so keys / strings / numbers clear WCAG AA on a pale panel — the
 * same split {@link JNode} uses for the JSON tree.
 */
const LOG_PALETTE = {
  dark: {
    key: "#67e8f9",
    string: "#fbbf24",
    number: "#34d399",
    keyword: "#a78bfa",
    punct: "#64748b",
    url: "#38bdf8",
  },
  light: {
    key: "#0e7490",
    string: "#047857",
    number: "#9a3412",
    keyword: "#6d28d9",
    punct: "#57534e",
    url: "#0369a1",
  },
} as const;

/** Resolved token colors for one theme — a light or dark row of
 *  {@link LOG_PALETTE}. */
type LogColors = Record<keyof (typeof LOG_PALETTE)["dark"], string>;

/** One pass matches, in priority order: a `"quoted"` string (with an optional
 *  trailing `:` that marks it a key), a `true`/`false`/`null` keyword, a bare
 *  number not glued to a word, or an `http(s)` URL. Everything else is plain. */
const TOKEN_RE =
  /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|(?<![\w.])(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(?![\w.])|(https?:\/\/[^\s"]+)/g;

/** Split one log message into colored spans by {@link TOKEN_RE}. Untouched
 *  runs stay as plain text nodes so the parent's tone color shows through. */
function highlightLog(text: string, c: LogColors): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const [full, str, colon, keyword, num, url] = m;
    if (str !== undefined && colon !== undefined) {
      out.push(
        <span key={key++} style={{ color: c.key }}>
          {str}
        </span>,
        <span key={key++} style={{ color: c.punct }}>
          {colon}
        </span>,
      );
    } else if (str !== undefined) {
      out.push(
        <span key={key++} style={{ color: c.string }}>
          {str}
        </span>,
      );
    } else if (keyword !== undefined) {
      out.push(
        <span key={key++} style={{ color: c.keyword }}>
          {keyword}
        </span>,
      );
    } else if (num !== undefined) {
      out.push(
        <span key={key++} style={{ color: c.number }}>
          {num}
        </span>,
      );
    } else if (url !== undefined) {
      out.push(
        <span key={key++} style={{ color: c.url, textDecoration: "underline" }}>
          {url}
        </span>,
      );
    }
    last = m.index + full.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/**
 * One console row — a tone-tinted level chip beside the message, the message
 * itself run through {@link highlightLog} for inline JSON/URL coloring and
 * rendered `pre-wrap` so pretty-printed payloads keep their shape. Internal to
 * {@link ResponsePanel}; not exported.
 *
 * @remarks
 * Status: stable — Type: presentational row
 *
 * State & behavior: pure — no state, no effects. Recomputes the highlight
 * spans on every render from `entry.msg`.
 *
 * Composition: a flex row of a fixed-width chip and a `flex-1` message column;
 * belongs inside the console's scroll region.
 *
 * Accessibility: text only, no interactive elements — the chip repeats the
 * level already conveyed by the message tone, so it carries no extra label.
 *
 * Test ids: none — the console list is addressed by its container
 * (`response-panel-console-list`); rows have no stable id to key on.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` tokens only.
 *
 * Edge cases: an unknown `entry.level` falls back to the `log` chip tint and
 * the default dim text tone.
 */
function LogLine({ entry, isLight }: LogLineProps) {
  const c = isLight ? LOG_PALETTE.light : LOG_PALETTE.dark;
  return (
    <div
      className={`flex gap-1.5 border-b border-app-border px-2.5 py-1 font-mono text-[11px] leading-relaxed ${
        LOG_TONE[entry.level as keyof typeof LOG_TONE] ?? "text-app-dim"
      }`}
    >
      <span
        className={`mt-px h-fit shrink-0 rounded px-1 text-[9px] font-semibold uppercase tracking-wide ${
          LEVEL_CHIP[entry.level as keyof typeof LEVEL_CHIP] ?? LEVEL_CHIP.log
        }`}
      >
        {entry.level}
      </span>
      <span className="min-w-0 flex-1 wrap-break-word whitespace-pre-wrap">
        {highlightLog(entry.msg, c)}
      </span>
    </div>
  );
}

type LogLineProps = {
  /** A single captured console entry — `level` picks the chip tint and the
   *  fallback text tone, `msg` is scanned for JSON tokens and URLs. */
  entry: { level: string; msg: string };
  /** Whether the active theme is light — selects the darker token palette so
   *  highlighted spans keep AA contrast on a pale panel. */
  isLight: boolean;
};

/**
 * Right pane: the calls a script will make, the variables a run extracted, and
 * the console it logged to. Owns the card/waterfall/docs view switch and the
 * step-mode toggle; the run loop itself lives in {@link BulkyApp}.
 *
 * @remarks
 * Status: stable — Type: pane
 *
 * State & behavior: two local states, both for the console panel —
 * `consoleHeight` (px, clamped to {@link CONSOLE_MIN}–{@link CONSOLE_MAX}) is
 * driven by dragging the resize handle at the panel's top edge, and
 * `consoleCollapsed` hides the log body leaving just the header strip. A
 * `dragRef` holds the pointer origin mid-drag. Neither is persisted — both
 * reset when the pane unmounts. Everything else is read from
 * `runnerSlice` (built calls, logs, extracted vars, assertions), `uiSlice`
 * (the active view) and `collectionsSlice` (active item and environment).
 * Picking a view
 * dispatches both `setResponseView` and, when an item is active,
 * `setResponseViewForItem`, so each request remembers how it was last read.
 * Promoting a variable writes it straight into the active environment.
 *
 * Variants: three content views — `cards`, `waterfall`, `docs`. The header
 * (title, step toggle, view switch, status dots) mounts only when a request
 * is active — with no active item there is no script to summarize. The
 * extracted, tests and console strips mount only when they have something to
 * show; the tests strip shows the run's pass/fail tally and every recorded
 * expectation.
 *
 * Composition: renders {@link CallCard} rows inside one bordered `LIST` card,
 * or {@link ApiWaterfall} / {@link ApiDocs} in their place, and one
 * {@link LogLine} per entry inside the console panel. Styling follows
 * the left pane's system — `app-*` Tailwind tokens and the `ui.*` recipes,
 * with the same header geometry, `ui.label` headings and `divide-y` list card
 * the sidebar panes use, rather than inline theme values. The console is a
 * bottom-anchored panel with a drag handle on its top edge and a
 * collapse toggle in its header; that header is a fixed `h-9` — matched to the
 * editor's status bar — and drops its bottom border while collapsed.
 *
 * Accessibility: every icon-only control has an `aria-label`; the step toggle
 * also carries `aria-pressed` and is disabled mid-run. View buttons mark the
 * current view with `data-active`. The console resize handle is a
 * `role="separator"` with `aria-orientation="horizontal"`; the collapse toggle
 * carries `aria-expanded`.
 *
 * Test ids: `response-panel-tests-list` on the assertions strip;
 * `response-panel-console-resize-handle` on the console drag handle,
 * `response-panel-console-collapse-button` on its collapse toggle,
 * `response-panel-console-list` on the scrollable log body; {@link CallCard}
 * carries the per-call ids.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases:
 * - No `api.*` calls in the script → the cards view shows a text-only empty
 *   state (no icon); {@link ApiWaterfall} renders its own matching one, docs
 *   renders its own.
 * - No active environment → the promote controls are hidden, since there is
 *   nowhere to promote a variable to.
 * - More than four built calls → the status dots cap at four and shift toward
 *   red as the count climbs past ten.
 * - Console drag past a bound → height is clamped to
 *   {@link CONSOLE_MIN}/{@link CONSOLE_MAX}, so the panel never collapses the
 *   content view or the handle out of reach.
 * - Console collapsed → the drag handle and log body are unmounted and the
 *   header's bottom border is dropped; the stored `consoleHeight` is kept and
 *   restored on expand.
 *
 * Dependencies: `lucide-react`, `react-redux`, `@/lib/ui`,
 * `@/components/ui/button`, `@/components/ui/button-group`,
 * `@/components/ui/tooltip`, `@/store/runnerSlice`, `@/store/uiSlice`,
 * `@/store/collectionsSlice`.
 *
 * @example
 * ```tsx
 * <ResponsePanel
 *   T={theme}
 *   stepMode={stepMode}
 *   running={running}
 *   onToggleStep={() => dispatch(setStepMode(!stepMode))}
 * />
 * ```
 *
 * @see {@link CallCard}
 * @see {@link ApiWaterfall}
 */
export default function ResponsePanel({
  T,
  stepMode,
  onToggleStep,
  running,
}: ResponsePanelProps) {
  const dispatch = useDispatch();
  const builtCalls = useSelector(selectBuiltCalls);
  const logs = useSelector(selectLogs);
  const view = useSelector(selectResponseView);
  const activeId = useSelector(selectActiveId);

  const extractedVars = useSelector(selectExtractedVars);
  const assertions = useSelector(selectAssertions);
  const activeEnv = useSelector(selectActiveEnv);

  const [consoleHeight, setConsoleHeight] = useState(CONSOLE_DEFAULT);
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const onHandleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startHeight: consoleHeight };
  };

  const onHandleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const next = drag.startHeight + (drag.startY - e.clientY);
    setConsoleHeight(Math.min(CONSOLE_MAX, Math.max(CONSOLE_MIN, next)));
  };

  const onHandleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const failedAssertions = assertions.filter((a) => !a.ok).length;
  const passedAssertions = assertions.length - failedAssertions;

  const dots = (() => {
    const count = builtCalls.length;
    const overflow = count > 4;
    const heat = count > 10;
    const heatLevel = heat ? Math.min(1, (count - 10) / 20) : 0;
    return builtCalls.slice(0, 4).map((c, i) => {
      let bg =
        c.status === "idle"
          ? T.border
          : c.status === "pending"
            ? T.cyan
            : statusColor(c.statusCode, T);
      if (heat) {
        const t = Math.min(1, heatLevel + (i / 3) * (1 - heatLevel) * 0.6);
        const r = Math.round(220 * t + 0 * (1 - t));
        const g = Math.round(50 * t + 200 * (1 - t));
        const b = Math.round(50 * t + 160 * (1 - t));
        bg = `rgb(${r},${g},${b})`;
      } else if (overflow) {
        bg = [T.cyan, T.warn, T.error, T.error][i] ?? T.error;
      }
      return { key: i, bg, status: c.status };
    });
  })();

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-app-sidebar pt-1">
      {/* Header — omitted entirely with no active request, since there is
          no script to summarize. */}
      {activeId && (
      <div className={HEADER}>
        <h2 className={`${ui.label} min-w-0 flex-1 truncate`}>Call Script</h2>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onToggleStep}
              disabled={running}
              aria-pressed={stepMode}
              data-active={stepMode || undefined}
              aria-label="Toggle step-by-step mode"
              className={STEP_BTN}
            >
              <Footprints size={14} aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {stepMode
              ? "Step mode on — click to disable"
              : "Enable step-by-step mode"}
          </TooltipContent>
        </Tooltip>

        <ButtonGroup className={GROUP_BOX}>
          {(["cards", "waterfall", "docs"] as const).map((v) => {
            const name =
              v === "cards"
                ? "Request list"
                : v === "waterfall"
                  ? "Waterfall view"
                  : "Documentation view";
            return (
              <Tooltip key={v}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      dispatch(setResponseView(v));
                      if (activeId)
                        dispatch(
                          setResponseViewForItem({ itemId: activeId, view: v }),
                        );
                    }}
                    data-active={view === v || undefined}
                    aria-label={name}
                    className={VIEW_BTN}
                  >
                    {v === "cards" ? (
                      <ListTodo size={14} aria-hidden="true" />
                    ) : v === "waterfall" ? (
                      <ChartGantt size={14} aria-hidden="true" />
                    ) : (
                      <BookCheck size={14} aria-hidden="true" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{name}</TooltipContent>
              </Tooltip>
            );
          })}
        </ButtonGroup>

        <div className="flex shrink-0 items-center gap-[3px]">
          {dots.map((d) => (
            <div
              key={d.key}
              style={{ background: d.bg }}
              className={`size-1.5 rounded-full transition-colors duration-500 ${
                d.status === "idle" ? "opacity-35" : "opacity-100"
              } ${d.status === "pending" ? "animate-[pulse_0.8s_ease-in-out_infinite]" : ""}`}
            />
          ))}
        </div>
        <span className={`${ui.meta} shrink-0`}>{builtCalls.length}</span>
      </div>
      )}

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {view === "waterfall" ? (
          <ApiWaterfall T={T} />
        ) : view === "docs" ? (
          <ApiDocs T={T} calls={builtCalls} />
        ) : builtCalls.length === 0 ? (
          <p className="p-4 text-center font-description text-[12px] text-app-dim">
            No api.* calls found in script
          </p>
        ) : (
          <div className={LIST}>
            {builtCalls.map((call, i) => (
              <CallCard key={i} T={T} call={call} />
            ))}
          </div>
        )}
      </div>

      {/* Extracted vars */}
      {Object.keys(extractedVars).length > 0 && (
        <div className="shrink-0 border-t border-app-border bg-app-sidebar pt-1">
          <div className={HEADER}>
            <ArrowUpFromLine
              size={12}
              aria-hidden="true"
              className="shrink-0 text-app-accent-dim"
            />
            <h2 className={`${ui.label} min-w-0 flex-1 truncate`}>Extracted</h2>
            {activeEnv && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      for (const [k, v] of Object.entries(extractedVars)) {
                        dispatch(
                          setVar({ envId: activeEnv.id, key: k, value: v }),
                        );
                      }
                    }}
                    aria-label={`Promote all variables to ${activeEnv.name}`}
                    className={PROMOTE_BTN}
                  >
                    promote all → {activeEnv.name}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  Promote all to {activeEnv.name}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <ul className={LIST}>
            {Object.entries(extractedVars).map(([k, v]) => (
              <li key={k} className={ROW}>
                <span className="shrink-0 font-mono text-[11px] text-app-accent">
                  {k}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-app-dim">
                  =
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-app-text">
                  {v}
                </span>
                {activeEnv && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() =>
                          dispatch(
                            setVar({ envId: activeEnv.id, key: k, value: v }),
                          )
                        }
                        aria-label={`Promote ${k} to ${activeEnv.name}`}
                        className={`${PROMOTE_BTN} ${ui.reveal}`}
                      >
                        → env
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Promote {k} to {activeEnv.name}
                    </TooltipContent>
                  </Tooltip>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tests — run-level pass/fail summary and the recorded expectations */}
      {assertions.length > 0 && (
        <div className="shrink-0 border-t border-app-border bg-app-sidebar pt-1">
          <div className={HEADER}>
            <BookCheck
              size={12}
              aria-hidden="true"
              className={`shrink-0 ${
                failedAssertions > 0 ? "text-app-error" : "text-app-success"
              }`}
            />
            <h2 className={`${ui.label} min-w-0 flex-1 truncate`}>Tests</h2>
            <span className="shrink-0 font-mono text-[10px] font-bold text-app-success">
              ✓ {passedAssertions}
            </span>
            {failedAssertions > 0 && (
              <span className="shrink-0 font-mono text-[10px] font-bold text-app-error">
                ✗ {failedAssertions}
              </span>
            )}
          </div>

          <ul
            className={`${LIST} max-h-33 overflow-y-auto`}
            data-testid="response-panel-tests-list"
          >
            {assertions.map((a, i) => (
              <li key={i} className={ROW}>
                <span
                  className={`shrink-0 font-mono text-[11px] font-bold ${
                    a.ok ? "text-app-success" : "text-app-error"
                  }`}
                >
                  {a.ok ? "✓" : "✗"}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-app-text">
                  {a.message}
                  {a.detail ? (
                    <span className="text-app-dim"> — {a.detail}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Console — a bottom-anchored panel: drag the top handle to resize,
          collapse it to reclaim the space for the content view. */}
      {logs.length > 0 && (
        <div
          className="flex shrink-0 flex-col overflow-hidden border-t border-app-border bg-app-editor"
          style={consoleCollapsed ? undefined : { height: consoleHeight }}
        >
          {!consoleCollapsed && (
            <div
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize console"
              onPointerDown={onHandleDown}
              onPointerMove={onHandleMove}
              onPointerUp={onHandleUp}
              onPointerCancel={onHandleUp}
              className="h-1.5 shrink-0 cursor-row-resize bg-app-border/40 transition-colors duration-150 hover:bg-app-accent/50"
              data-testid="response-panel-console-resize-handle"
            />
          )}
          <div
            className={`${HEADER} h-9 shrink-0 ${
              consoleCollapsed ? "" : "border-b border-app-border"
            }`}
          >
            <h2 className={ui.label}>Console</h2>
            <span className={ui.meta}>{logs.length}</span>
            <div className="flex-1" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setConsoleCollapsed((c) => !c)}
                  aria-expanded={!consoleCollapsed}
                  aria-label={
                    consoleCollapsed ? "Expand console" : "Collapse console"
                  }
                  className={`${ui.iconBtn} size-6`}
                  data-testid="response-panel-console-collapse-button"
                >
                  {consoleCollapsed ? (
                    <ChevronUp size={12} aria-hidden="true" />
                  ) : (
                    <ChevronDown size={12} aria-hidden="true" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {consoleCollapsed ? "Expand console" : "Collapse console"}
              </TooltipContent>
            </Tooltip>
          </div>
          {!consoleCollapsed && (
            <div
              className="min-h-0 flex-1 overflow-y-auto"
              data-testid="response-panel-console-list"
            >
              {logs.map((l, i) => (
                <LogLine key={i} entry={l} isLight={!!T.isLight} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type ResponsePanelProps = {
  /** Active theme, forwarded to the call/waterfall/docs children and used for
   *  the status-dot colors, which are computed, not tokenized. */
  T: Theme;
  /** Whether step-by-step mode is armed. Drives the toggle's active tint;
   *  owned by {@link BulkyApp}, shared with {@link CodeEditor}'s run loop. */
  stepMode: boolean;
  /** Fires on the toggle to arm/disarm step-by-step mode. */
  onToggleStep: () => void;
  /** Whether a run is in progress. Disables the step toggle mid-run. */
  running: boolean;
};
