"use client";

import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  List,
  ChevronUp,
  ChevronDown,
  ArrowUpFromLine,
  ListTodo,
  ChartGantt,
  BookCheck,
  Footprints,
} from "lucide-react";
import type { Theme } from "@/lib/themes";
import {
  selectBuiltCalls,
  selectLogs,
  selectExtractedVars,
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

/** View-toggle container: bordered, clipped so its `Button` children read as
 *  one segmented block instead of three floating icons. */
const VIEW_GROUP =
  "overflow-hidden rounded-md border border-app-border bg-app-hover p-0.5";

/** View-toggle button: ghost hover/active tracks the runtime theme via the
 *  `app-*` tokens instead of Button's default (static) muted/foreground. */
const VIEW_BTN =
  "rounded text-app-dim hover:bg-app-selected hover:text-app-accent data-active:bg-app-selected data-active:text-app-accent";

/** Call list container: one bordered, `divide-y` group — same "request list"
 *  recipe as `CollPane`/`VarsPane` — instead of each `CallCard` owning its
 *  own bottom border. */
const CALL_LIST =
  "mx-2 my-2 flex flex-col overflow-hidden rounded-md border border-app-border divide-y divide-app-border";

/** Step toggle: ghost at rest, tints warn (matching the editor's old "Step
 *  mode" indicator) once armed — relocated here from the editor's footer
 *  since step-through pauses land on this panel's call list. */
const STEP_BTN =
  "rounded-md text-app-dim hover:bg-app-hover hover:text-app-accent data-active:bg-app-warn/15 data-active:text-app-warn disabled:pointer-events-none disabled:opacity-50";

type Props = {
  T: Theme;
  /** Whether step-by-step mode is armed. Drives the toggle's active tint;
   *  owned by {@link BulkyApp}, shared with {@link CodeEditor}'s run loop. */
  stepMode: boolean;
  /** Fires on the toggle to arm/disarm step-by-step mode. */
  onToggleStep: () => void;
  /** Whether a run is in progress. Disables the toggle mid-run. */
  running: boolean;
};

export default function ResponsePanel({ T, stepMode, onToggleStep, running }: Props) {
  const dispatch = useDispatch();
  const builtCalls = useSelector(selectBuiltCalls);
  const logs = useSelector(selectLogs);
  const view = useSelector(selectResponseView);
  const activeId = useSelector(selectActiveId);

  const extractedVars = useSelector(selectExtractedVars);
  const activeEnv = useSelector(selectActiveEnv);

  const [consoleExpanded, setConsoleExpanded] = useState(false);

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: T.bgPanel,
        minWidth: 0,
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 12px",
          height: 44,
          background: T.bg,
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-title)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: T.textDim,
            flex: 1,
          }}
        >
          Call Script
        </span>

        {/* Step toggle — relocated from the editor's footer */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onToggleStep}
              disabled={running}
              aria-pressed={stepMode}
              data-active={stepMode || undefined}
              aria-label="Toggle step-by-step mode"
              className={STEP_BTN}
            >
              <Footprints size={12} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {stepMode ? "Step mode on — click to disable" : "Enable step-by-step mode"}
          </TooltipContent>
        </Tooltip>

        {/* View toggle */}
        <ButtonGroup className={VIEW_GROUP}>
          {(["cards", "waterfall", "docs"] as const).map((v) => (
            <Tooltip key={v}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    dispatch(setResponseView(v));
                    if (activeId)
                      dispatch(
                        setResponseViewForItem({ itemId: activeId, view: v }),
                      );
                  }}
                  data-active={view === v || undefined}
                  aria-label={
                    v === "cards"
                      ? "Request list"
                      : v === "waterfall"
                        ? "Waterfall view"
                        : "Documentation view"
                  }
                  className={VIEW_BTN}
                >
                  {v === "cards" ? (
                    <ListTodo size={12} />
                  ) : v === "waterfall" ? (
                    <ChartGantt size={12} />
                  ) : (
                    <BookCheck size={12} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {v === "cards"
                  ? "Request list"
                  : v === "waterfall"
                    ? "Waterfall view"
                    : "Documentation view"}
              </TooltipContent>
            </Tooltip>
          ))}
        </ButtonGroup>

        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
          {(() => {
            const count = builtCalls.length;
            const overflow = count > 4;
            const heat = count > 10;
            const heatLevel = heat ? Math.min(1, (count - 10) / 20) : 0;
            const dots = builtCalls.slice(0, 4);
            return dots.map((c, i) => {
              let bg =
                c.status === "idle"
                  ? T.border
                  : c.status === "pending"
                    ? T.cyan
                    : statusColor(c.statusCode, T);
              if (heat) {
                const t = Math.min(
                  1,
                  heatLevel + (i / 3) * (1 - heatLevel) * 0.6,
                );
                const r = Math.round(220 * t + 0 * (1 - t));
                const g = Math.round(50 * t + 200 * (1 - t));
                const b = Math.round(50 * t + 160 * (1 - t));
                bg = `rgb(${r},${g},${b})`;
              } else if (overflow) {
                const gradients = [T.cyan, T.warn, T.error, T.error];
                bg = gradients[i] ?? T.error;
              }
              return (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: bg,
                    transition: "background 0.6s",
                    opacity: c.status === "idle" ? 0.35 : 1,
                    animation:
                      c.status === "pending"
                        ? "pulse 0.8s ease-in-out infinite"
                        : undefined,
                  }}
                />
              );
            });
          })()}
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: T.cyanDim,
            marginLeft: 6,
          }}
        >
          {builtCalls.length}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {view === "waterfall" ? (
          <ApiWaterfall T={T} />
        ) : view === "docs" ? (
          <ApiDocs T={T} calls={builtCalls} />
        ) : builtCalls.length === 0 ? (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              opacity: 0.3,
            }}
          >
            <List size={32} color={T.textDim} strokeWidth={1} />
            <span
              style={{
                fontFamily: "var(--font-description)",
                fontSize: 11,
                color: T.textDim,
              }}
            >
              No api.* calls found in script
            </span>
          </div>
        ) : (
          <div className={CALL_LIST}>
            {builtCalls.map((call, i) => (
              <CallCard key={i} T={T} call={call} />
            ))}
          </div>
        )}
      </div>

      {/* Extracted vars */}
      {Object.keys(extractedVars).length > 0 && (
        <div
          style={{
            borderTop: `1px solid ${T.border}`,
            background: T.bgPanel,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: "4px 10px",
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <ArrowUpFromLine size={10} color={T.cyanDim} />
            <span
              style={{
                fontFamily: "var(--font-title)",
                fontSize: 8,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: T.textDim,
                flex: 1,
              }}
            >
              Extracted
            </span>
            {activeEnv && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      for (const [k, v] of Object.entries(extractedVars)) {
                        dispatch(
                          setVar({ envId: activeEnv.id, key: k, value: v }),
                        );
                      }
                    }}
                    style={{
                      background: T.bgHover,
                      border: `1px solid ${T.borderAccent}`,
                      borderRadius: 4,
                      padding: "2px 7px",
                      color: T.cyan,
                      fontFamily: "var(--font-display)",
                      fontSize: 8,
                      fontWeight: 700,
                      cursor: "pointer",
                      letterSpacing: "0.07em",
                    }}
                  >
                    promote all → {activeEnv.name}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Promote all to {activeEnv.name}</TooltipContent>
              </Tooltip>
            )}
          </div>
          <div
            style={{
              padding: "6px 10px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {Object.entries(extractedVars).map(([k, v]) => (
              <div
                key={k}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    color: T.cyan,
                    flexShrink: 0,
                  }}
                >
                  {k}
                </span>
                <span style={{ color: T.textDim, fontSize: 9 }}>=</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    color: T.text,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {v}
                </span>
                {activeEnv && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() =>
                          dispatch(
                            setVar({ envId: activeEnv.id, key: k, value: v }),
                          )
                        }
                        style={{
                          background: "transparent",
                          border: `1px solid ${T.border}`,
                          borderRadius: 4,
                          padding: "1px 6px",
                          color: T.textDim,
                          fontFamily: "var(--font-display)",
                          fontSize: 8,
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        → env
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Promote {k} to {activeEnv.name}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Console */}
      {logs.length > 0 && (
        <div
          style={{
            borderTop: `1px solid ${T.border}`,
            maxHeight: consoleExpanded ? 240 : 90,
            overflowY: "auto",
            background: T.editorBg,
            flexShrink: 0,
            transition: "max-height 0.2s ease",
          }}
        >
          <div
            style={{
              padding: "3px 10px",
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              gap: 6,
              position: "sticky",
              top: 0,
              background: T.editorBg,
              zIndex: 1,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-title)",
                fontSize: 8,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: T.textDim,
              }}
            >
              Console
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 8,
                color: T.textDim,
              }}
            >
              {logs.length}
            </span>
            <div style={{ flex: 1 }} />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setConsoleExpanded((e) => !e)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: T.textDim,
                    display: "flex",
                    alignItems: "center",
                    padding: 2,
                  }}
                >
                  {consoleExpanded ? (
                    <ChevronDown size={11} />
                  ) : (
                    <ChevronUp size={11} />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {consoleExpanded ? "Collapse console" : "Expand console"}
              </TooltipContent>
            </Tooltip>
          </div>
          {logs.map((l, i) => (
            <div
              key={i}
              style={{
                padding: "3px 10px",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                borderBottom: `1px solid ${T.border}`,
                color:
                  l.level === "error"
                    ? T.error
                    : l.level === "warn"
                      ? T.warn
                      : T.textDim,
              }}
            >
              <span style={{ color: T.textDim, marginRight: 6 }}>
                [{l.level}]
              </span>
              {l.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
