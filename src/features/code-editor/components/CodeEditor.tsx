"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useDispatch, useSelector } from "react-redux";
import {
  FolderOpen,
  Feather,
  ChevronDown,
  SkipForward,
  BookOpen,
  WandSparkles,
  Square,
} from "lucide-react";
import type { Theme } from "@/lib/themes";
import { selectCode, setCode } from "@/store/editorSlice";
import {
  selectActiveItem,
  selectActiveCollection,
  selectCollections,
  selectEnvVars,
  setActiveId,
  renameCollection,
  renameItem,
} from "@/store/collectionsSlice";
import { EXAMPLE_SCRIPTS } from "@/lib/sampleData";
import type { ExampleScript } from "@/lib/sampleData";
import MethodPill from "@/components/MethodPill";
import ExampleDialog from "./ExampleDialog";
import { Input } from "@/components/ui/input";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { EditorInstance } from "./MonacoCodeEditor";
import * as prettier from "prettier/standalone";
import * as babelPlugin from "prettier/plugins/babel";
import * as estreePlugin from "prettier/plugins/estree";

const MonacoCodeEditor = dynamic(() => import("./MonacoCodeEditor"), {
  ssr: false,
});

/** Footer toggle: borderless, sits flush in the status bar — fills with a
 *  faint accent tint on hover/active instead of drawing its own box. */
const TOOL_BTN =
  "flex h-6 shrink-0 items-center gap-1 rounded border-0 bg-transparent px-1.5 text-app-dim transition-colors duration-200 " +
  "hover:bg-app-selected hover:text-app-accent " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-1 focus-visible:ring-offset-app-panel " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "data-active:bg-app-accent-faint data-active:text-app-accent";

/** Run / Stop / Next: the pane's solid action blocks. No gradient, no glow. */
const ACTION_BTN =
  "flex h-8 shrink-0 items-center gap-1.5 rounded-md border-0 px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-app-on-solid " +
  "transition-transform duration-200 hover:scale-105 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel";

const TOOL_LABEL = "text-[11px] font-semibold uppercase tracking-[0.07em]";

/** Wraps the footer's utility toggles for spacing only — no outer border or
 *  radius, so the group reads as embedded in the status bar rather than a
 *  floating segmented block. */
const GROUP_BOX = "gap-0.5";

type Props = {
  /** Active theme, passed straight through to {@link MonacoCodeEditor} and
   *  {@link ExampleDialog} — this component reads no theme values itself. */
  T: Theme;
  /** Fires on the Run button and the ⌘↵ shortcut (handled by the parent,
   *  which owns the run loop — this component only renders the shortcut
   *  label on the button itself). */
  onRun: () => void;
  /** Fires on the Next button, shown only while `paused`. */
  onNext: () => void;
  /** Fires on the Stop button, shown only while `running` and not `paused`. */
  onStop: () => void;
  /** Whether a run is in progress. Swaps the action block to Stop (or Next,
   *  if also `paused`). */
  running: boolean;
  /** Whether a stepped run is currently paused. Shows the pulsing Next
   *  action block in place of Run/Stop. */
  paused: boolean;
};

/**
 * The editor panel: toolbar (breadcrumb, run/stop/next), the Monaco
 * instance, and a footer status bar (method, format, examples,
 * language/runtime).
 *
 * @remarks
 * Status: stable — Type: panel
 *
 * State & behavior: `openMenu` gates one of two breadcrumb dropdowns
 * (collection/request pickers) — only one is open at a time, positioned via
 * `menuPos` computed from the trigger's `getBoundingClientRect()` on open.
 * The footer's Examples menu is a separate, self-contained `examplesOpen`
 * flag driving a Radix {@link Popover} instead of that manual positioning.
 * `renaming`/`renameDraft` swap the breadcrumb's collection or request name
 * for an inline `Input`, committed on blur/Enter, discarded on Escape.
 * `selectedExample` gates {@link ExampleDialog} once a menu entry is picked.
 * Format runs Prettier on the current code and falls back to Monaco's own
 * format action if Prettier throws (e.g. code that doesn't parse as a
 * module).
 *
 * Variants: renders "Scratch Pad" in the breadcrumb instead of a
 * collection/request pair when no item is active.
 *
 * Composition: renders {@link MonacoCodeEditor} (dynamically imported,
 * `ssr: false`) for the editor body and {@link ExampleDialog} for the
 * selected example's preview. Each breadcrumb segment renders as an
 * input-styled label (`bg-app-hover`, matching the {@link Input} recipe)
 * with a trailing `ChevronDown`, signaling it opens a dropdown rather than
 * navigating like a link; the two segments are joined by a literal `/`
 * separator instead of an arrow, reading as a path. The collection segment's
 * picker lists every collection and jumps to its first request (collections
 * with none are disabled); the request segment's picker lists only the
 * active collection's requests. The footer status bar (not the top toolbar)
 * leads with the
 * active item's {@link MethodPill} (omitted for Scratch Pad), then Format
 * and Examples — grouped for spacing only, borderless so the group reads as
 * embedded in the bar rather than a floating segmented block. Examples opens
 * a `Popover` (`@/components/ui/popover`) anchored to its trigger, listing
 * each {@link ExampleScript} behind a small {@link MethodPill} inside a
 * vertical `ButtonGroup`; picking one closes the popover and opens
 * {@link ExampleDialog} for that script. The footer's language label sits
 * beside the runtime label, joined by `·`.
 *
 * Accessibility: the breadcrumb pickers carry `aria-haspopup="menu"` and
 * `aria-expanded`; each breadcrumb dropdown itself is `role="menu"` with
 * `role="menuitem"` entries, and Escape closes whichever one is open and
 * returns focus to its trigger. The Examples trigger carries
 * `aria-expanded` only — Radix's `Popover` supplies its own
 * `aria-haspopup`/`aria-controls` wiring and Escape/outside-click dismissal.
 *
 * Test ids: breadcrumb rename fields
 * `code-editor-rename-collection-input` / `code-editor-rename-item-input`
 * (single instance each, via the shared `Input`). The breadcrumb triggers,
 * toolbar buttons, and dropdown/popover entries carry no testid — all are
 * reachable by role and their own (static or, for the breadcrumb triggers,
 * dynamic but singular) accessible name.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases: picking a collection with no requests from the collection
 * dropdown is a no-op beyond closing the menu — there is nothing to make
 * active. A rename committed as only whitespace is discarded, leaving the
 * original name intact.
 *
 * Dependencies: `lucide-react`, `next/dynamic`, `react-redux`, `prettier/
 * standalone` + `plugins/babel` + `plugins/estree`, `@/components/
 * MethodPill`, `@/components/ui/input`, `@/components/ui/button-group`,
 * `@/components/ui/tooltip`, `@/components/ui/popover`, `./ExampleDialog`,
 * `./MonacoCodeEditor`, `@/store/editorSlice`, `@/store/collectionsSlice`,
 * `@/lib/sampleData`.
 *
 * @example
 * ```tsx
 * <CodeEditor
 *   T={theme}
 *   onRun={runScript}
 *   onNext={stepNext}
 *   onStop={stopRun}
 *   running={running}
 *   paused={paused}
 * />
 * ```
 */
export default function CodeEditor({
  T,
  onRun,
  onNext,
  onStop,
  running,
  paused,
}: Props) {
  const dispatch = useDispatch();
  const code = useSelector(selectCode);
  const activeItem = useSelector(selectActiveItem);
  const activeCollection = useSelector(selectActiveCollection);
  const collections = useSelector(selectCollections);
  const envVars = useSelector(selectEnvVars);
  const monacoEditorRef = useRef<EditorInstance | null>(null);
  const collBtnRef = useRef<HTMLButtonElement>(null);
  const itemBtnRef = useRef<HTMLButtonElement>(null);
  const [openMenu, setOpenMenu] = useState<"coll" | "item" | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [selectedExample, setSelectedExample] = useState<ExampleScript | null>(
    null,
  );
  const [renaming, setRenaming] = useState<"coll" | "item" | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  /** Opens the breadcrumb's collection/request picker anchored under `ref`,
   *  or closes it if already open. The toolbar's Examples menu is a
   *  {@link Popover} instead and manages its own open state. */
  const openDropdown = (
    kind: "coll" | "item",
    ref: React.RefObject<HTMLButtonElement | null>,
  ) => {
    if (openMenu === kind) {
      setOpenMenu(null);
      return;
    }
    const el = ref.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 4, left: r.left });
    }
    setOpenMenu(kind);
  };

  const selectCollectionRow = (col: (typeof collections)[number]) => {
    const first = col.items[0];
    if (first) {
      dispatch(setActiveId(first.id));
      dispatch(setCode(first.code));
    }
    setOpenMenu(null);
  };

  const selectItemRow = (it: (typeof collections)[number]["items"][number]) => {
    dispatch(setActiveId(it.id));
    dispatch(setCode(it.code));
    setOpenMenu(null);
  };

  const startRename = (kind: "coll" | "item") => {
    setOpenMenu(null);
    setRenaming(kind);
    setRenameDraft(
      (kind === "coll" ? activeCollection?.name : activeItem?.name) ?? "",
    );
  };

  const commitRename = () => {
    const name = renameDraft.trim();
    if (name) {
      if (renaming === "coll" && activeCollection)
        dispatch(renameCollection({ id: activeCollection.id, name }));
      if (renaming === "item" && activeItem)
        dispatch(renameItem({ itemId: activeItem.id, name }));
    }
    setRenaming(null);
  };

  // Escape closes whichever breadcrumb dropdown is open — none had keyboard
  // dismissal before. The Examples Popover handles its own Escape via Radix.
  useEffect(() => {
    if (!openMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const kind = openMenu;
        setOpenMenu(null);
        if (kind === "coll") collBtnRef.current?.focus();
        if (kind === "item") itemBtnRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openMenu]);

  const handleFormat = async () => {
    try {
      const formatted = await prettier.format(code, {
        parser: "babel",
        plugins: [babelPlugin, estreePlugin],
        singleQuote: true,
        printWidth: 80,
        trailingComma: "all",
      });
      dispatch(setCode(formatted));
    } catch (e) {
      console.warn("Prettier format failed:", e);
      monacoEditorRef.current?.getAction("editor.action.formatDocument")?.run();
    }
  };

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-app-editor">
      {/* Toolbar */}
      <div className="flex h-11 min-w-0 shrink-0 items-center gap-2 border-b border-app-border bg-app-panel px-3">
        <FolderOpen
          size={14}
          className="shrink-0 text-app-accent-dim"
          aria-hidden="true"
        />

        {/* Breadcrumb — collection and request are both a dropdown picker on
            click and an inline rename field on double-click. */}
        {activeItem && activeCollection ? (
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {renaming === "coll" ? (
              <Input
                autoFocus
                icon={Feather}
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenaming(null);
                }}
                onBlur={commitRename}
                aria-label={`Rename ${activeCollection.name}`}
                data-testid="code-editor-rename-collection-input"
                className="max-w-[120px] shrink-0 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em]"
              />
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    ref={collBtnRef}
                    type="button"
                    onClick={() => openDropdown("coll", collBtnRef)}
                    onDoubleClick={() => startRename("coll")}
                    aria-haspopup="menu"
                    aria-expanded={openMenu === "coll"}
                    data-active={openMenu === "coll" || undefined}
                    className="flex max-w-[100px] shrink-0 items-center gap-1 rounded-md border-2 border-transparent bg-app-hover px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-app-dim transition-colors duration-200 hover:text-app-accent focus-visible:outline-none focus-visible:border-app-accent data-active:border-app-accent data-active:text-app-accent"
                  >
                    <span className="truncate">{activeCollection.name}</span>
                    <ChevronDown
                      size={10}
                      className="shrink-0 opacity-60"
                      aria-hidden="true"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  Click to switch collection, double-click to rename
                </TooltipContent>
              </Tooltip>
            )}
            <span
              className="shrink-0 select-none text-[12px] text-app-dim"
              aria-hidden="true"
            >
              /
            </span>
            {renaming === "item" ? (
              <Input
                autoFocus
                icon={Feather}
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenaming(null);
                }}
                onBlur={commitRename}
                aria-label={`Rename ${activeItem.name}`}
                data-testid="code-editor-rename-item-input"
                className="min-w-0 flex-1 py-0.5 text-[12px]"
              />
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    ref={itemBtnRef}
                    type="button"
                    onClick={() => openDropdown("item", itemBtnRef)}
                    onDoubleClick={() => startRename("item")}
                    aria-haspopup="menu"
                    aria-expanded={openMenu === "item"}
                    data-active={openMenu === "item" || undefined}
                    className="flex max-w-[100px] shrink-0 items-center gap-1 rounded-md border-2 border-transparent bg-app-hover px-2 py-1 text-left text-[12px] font-bold tracking-[0.02em] text-app-bright transition-colors duration-200 hover:text-app-accent focus-visible:outline-none focus-visible:border-app-accent data-active:border-app-accent data-active:text-app-accent"
                  >
                    <span className="truncate">{activeItem.name}</span>
                    <ChevronDown
                      size={10}
                      className="shrink-0 opacity-60"
                      aria-hidden="true"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  Click to switch request, double-click to rename
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        ) : (
          <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-app-dim">
            Scratch Pad
          </span>
        )}

        {/* Next — only when paused in step mode */}
        {paused && (
          <button
            type="button"
            onClick={onNext}
            className={`${ACTION_BTN} animate-[pulse_1s_ease-in-out_infinite] bg-app-warn focus-visible:ring-app-warn`}
          >
            <SkipForward size={13} fill="currentColor" aria-hidden="true" />
            Next
          </button>
        )}

        {/* Stop — only while running */}
        {running && !paused && (
          <button
            type="button"
            onClick={onStop}
            className={`${ACTION_BTN} bg-app-error focus-visible:ring-app-error`}
          >
            <Square size={12} fill="currentColor" aria-hidden="true" />
            Stop
          </button>
        )}

        {/* Run — hidden while running or paused */}
        {!running && !paused && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onRun}
                className={`${ACTION_BTN} bg-app-accent focus-visible:ring-app-accent`}
              >
                Run
                <span className="text-[10px] font-normal normal-case tracking-normal opacity-75">
                  ⌘↵
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Run shortcut</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Editor body */}
      <div className="relative flex-1 overflow-hidden">
        <MonacoCodeEditor
          value={code}
          onChange={(v) => dispatch(setCode(v))}
          envVars={envVars}
          T={T}
          onRun={onRun}
          onMount={(editor) => {
            monacoEditorRef.current = editor;
          }}
        />
      </div>

      {/* Breadcrumb dropdowns — collection/request pickers; only one open at
          a time. The Examples menu lives in its own Popover in the footer. */}
      {openMenu && menuPos && (
        <>
          <div
            className="fixed inset-0 z-49"
            onClick={() => setOpenMenu(null)}
          />
          <div
            role="menu"
            aria-label={
              openMenu === "coll" ? "Switch collection" : "Switch request"
            }
            style={{ top: menuPos.top, left: menuPos.left }}
            className="fixed z-50 max-h-[60vh] min-w-[230px] overflow-y-auto rounded-lg border-2 border-app-border-mid bg-app-panel p-1"
          >
            {openMenu === "coll" &&
              collections.map((col) => {
                const empty = col.items.length === 0;
                return (
                  <button
                    key={col.id}
                    type="button"
                    role="menuitem"
                    disabled={empty}
                    onClick={() => selectCollectionRow(col)}
                    data-active={col.id === activeCollection?.id || undefined}
                    className="flex w-full items-center gap-2.5 rounded-md border-0 bg-transparent px-2.5 py-2 text-left transition-colors duration-200 hover:bg-app-hover focus-visible:bg-app-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-accent disabled:pointer-events-none disabled:opacity-40 data-active:bg-app-accent-faint data-active:text-app-accent"
                  >
                    <FolderOpen
                      size={13}
                      aria-hidden="true"
                      className="shrink-0 text-app-dim"
                    />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-app-text">
                      {col.name}
                    </span>
                  </button>
                );
              })}

            {openMenu === "item" &&
              activeCollection?.items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  role="menuitem"
                  onClick={() => selectItemRow(it)}
                  data-active={it.id === activeItem?.id || undefined}
                  className="flex w-full items-center gap-2.5 rounded-md border-0 bg-transparent px-2.5 py-2 text-left transition-colors duration-200 hover:bg-app-hover focus-visible:bg-app-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-accent data-active:bg-app-accent-faint data-active:text-app-accent"
                >
                  <span className="flex w-11 shrink-0 justify-center">
                    <MethodPill method={it.method} sm focusable={false} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-app-text">
                    {it.name}
                  </span>
                </button>
              ))}
          </div>
        </>
      )}

      {/* Example preview dialog */}
      {selectedExample && (
        <ExampleDialog
          T={T}
          example={selectedExample}
          onClose={() => setSelectedExample(null)}
          onLoad={() => {
            dispatch(setCode(selectedExample.code));
            setSelectedExample(null);
          }}
        />
      )}

      {/* Status bar */}
      <div className="flex min-w-0 shrink-0 items-center gap-2 border-t border-app-border bg-app-panel px-3 py-1.5">
        {activeItem && <MethodPill method={activeItem.method} sm />}

        <ButtonGroup className={GROUP_BOX}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={handleFormat} className={TOOL_BTN}>
                <WandSparkles size={13} aria-hidden="true" />
                <span className={TOOL_LABEL}>Format</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Format document (Shift+Alt+F)</TooltipContent>
          </Tooltip>

          <Popover open={examplesOpen} onOpenChange={setExamplesOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-expanded={examplesOpen}
                data-active={examplesOpen || undefined}
                className={TOOL_BTN}
              >
                <BookOpen size={13} aria-hidden="true" />
                <span className={TOOL_LABEL}>Examples</span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="center"
              aria-label="Example scripts"
              className="p-0"
            >
              <ButtonGroup
                orientation="vertical"
                className="w-full flex-col gap-0"
              >
                {EXAMPLE_SCRIPTS.map((ex) => (
                  <button
                    key={ex.label}
                    type="button"
                    onClick={() => {
                      setSelectedExample(ex);
                      setExamplesOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md border-0 bg-transparent px-2.5 py-2 text-left transition-colors duration-200 hover:bg-app-accent-faint hover:text-app-accent focus-visible:bg-app-accent-faint focus-visible:text-app-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-accent"
                  >
                    <span className="flex w-11 shrink-0 justify-center">
                      <MethodPill method={ex.method} sm focusable={false} />
                    </span>
                    <span className="text-[12px] text-app-text">
                      {ex.label}
                    </span>
                  </button>
                ))}
              </ButtonGroup>
            </PopoverContent>
          </Popover>

        </ButtonGroup>

        <span className="flex-1" />
        <span className="shrink-0 text-[11px] text-app-dim">
          JavaScript <span className="text-app-border-mid">·</span>{" "}
          <span className="text-app-accent-dim">Bulky Runtime v1.0</span>
        </span>
      </div>
    </div>
  );
}
