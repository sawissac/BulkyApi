"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fuzzyFilter } from "@/lib/fuzzyMatch";
import { Input } from "@/components/ui/input";
import MethodPill from "@/components/MethodPill";
import * as ui from "@/lib/ui";

export type CommandCategory = "Actions" | "Examples" | "Requests" | "Environments";

export type Command = {
  /** Stable key for the row, unique across every command in the list —
   *  not shown, used only as the React `key` and to track it through
   *  filtering/sorting. */
  id: string;
  /** Which fixed-order section (Actions, Examples, Requests, Environments)
   *  the row groups under. */
  category: CommandCategory;
  /** Row's primary text and the only field a plain-text search matches
   *  itself against alongside {@link Command.sublabel} and
   *  {@link Command.keywords}. */
  label: string;
  /** Secondary text right-aligned on the row — e.g. a request's parent
   *  collection name. Also fuzzy-matchable. */
  sublabel?: string;
  /** Extra terms the fuzzy search should match even though they never
   *  render — e.g. `["fullscreen"]` on a display-mode toggle whose label
   *  reads "Enter fullscreen" already, kept here for query variants like
   *  "full screen" or "zen". */
  keywords?: string[];
  /** HTTP method (or pseudo-method like `SSE`/`DOCS`) to render as a
   *  {@link MethodPill} in place of {@link Command.icon} — set for Examples
   *  and Requests rows, left unset for Actions/Environments. */
  method?: string;
  /** Leading icon shown when {@link Command.method} is unset. */
  icon?: LucideIcon;
  /** Fires on Enter (for the selected row) or a row click. The palette
   *  closes itself right after — this callback does not need to. */
  onSelect: () => void;
};

type Props = {
  /** Every command the palette can currently show, already filtered by the
   *  caller for what's contextually relevant (e.g. `CodeEditor` only
   *  includes a "Stop run" entry while a run is in progress) — this
   *  component only fuzzy-filters by `query`, it does not decide relevance. */
  commands: Command[];
  /** Fires on Escape, a scrim click, and right after any command runs. The
   *  palette does not close itself independently of this — the parent owns
   *  unmounting it (mirrors {@link ExampleDialog}). */
  onClose: () => void;
};

/** Fixed section order — matches how the four categories read as a
 *  priority list: what to do, then what to look at, then where to go. */
const CATEGORY_ORDER: CommandCategory[] = [
  "Actions",
  "Examples",
  "Requests",
  "Environments",
];

/** Shortcut-hint chip, the same recipe `EditorEmptyState`'s footer uses. */
const KEY_CAP =
  "rounded border border-app-border-mid bg-app-hover px-1.5 py-0.5 font-mono text-[10px] text-app-dim";

/**
 * Global command palette: a filterable, keyboard-navigable list of every
 * high-level thing the app can do right now — run, stop, or step the
 * script, format it, open Tweaks, toggle fullscreen, jump to a sidebar tab,
 * preview an example, or switch to any request or environment. Reach for
 * this as the single fast entry point instead of the footer's separate
 * Format/Examples controls, the sidebar tabs, or `ActivityRail`'s
 * Tweaks/fullscreen buttons.
 *
 * @remarks
 * Status: stable — Type: dialog
 *
 * State & behavior: `query` and `selectedIndex` are the only state, both
 * reset for free on every mount since the parent conditionally renders this
 * component instead of toggling an `open` prop. Results are grouped by
 * `command.category` in {@link CATEGORY_ORDER}; each group is fuzzy-filtered
 * ({@link fuzzyFilter}, `@/lib/fuzzyMatch`) against `label` + `sublabel` +
 * `keywords` once `query` is non-empty, and left in `commands`' own order
 * when it is blank. A category left with no matches renders nothing — no
 * empty-state row per group.
 *
 * Variants: none.
 *
 * Composition: renders {@link MethodPill} for a command carrying `method`
 * (Examples/Requests rows), otherwise its own `icon` when given (Actions
 * rows), otherwise no leading glyph (Environments rows). Category names
 * render as plain, non-interactive dividers, styled with `ui.label`
 * (`@/lib/ui`) — never part of keyboard traversal.
 *
 * Accessibility: `role="dialog"` + `aria-modal`, labelled "Command palette".
 * Escape closes; a click on the scrim (and only the scrim) closes. Focus
 * moves to the search input on mount but is not trapped — Tab can still
 * reach the page behind it, the same tradeoff {@link ExampleDialog} makes.
 * Arrow Up/Down move the selection through the flattened, currently-visible
 * result list (wrapping at both ends) via the input's own `onKeyDown`, not a
 * `tabIndex` per row; Enter runs the selected command and closes.
 *
 * Test ids: search input `command-palette-input`. Rows carry no
 * testid — each is reachable by role and its own (label) accessible name;
 * the current keyboard selection is `data-selected`, not a testid.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only,
 * reusing `ui.row`/`ui.label` (`@/lib/ui`) for the result rows and headers.
 *
 * Edge cases: a `query` matching nothing renders the panel with an empty
 * results area (no "no results" message) — the footer hint bar keeps the
 * panel from reading as broken. Enter with no results is a no-op, not a
 * thrown error.
 *
 * Dependencies: `lucide-react`, `@/lib/fuzzyMatch`, `@/lib/ui`,
 * `@/components/ui/input`, `@/components/MethodPill`.
 *
 * @example
 * ```tsx
 * {commandPaletteOpen && (
 *   <CommandPalette
 *     commands={commands}
 *     onClose={() => dispatch(setCommandPaletteOpen(false))}
 *   />
 * )}
 * ```
 *
 * @see {@link ExampleDialog}
 */
export default function CommandPalette({ commands, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Resets `selectedIndex` to 0 whenever `query` changes — the "adjust state
  // when a value changes" pattern (react.dev/learn/you-might-not-need-an-effect),
  // not an Effect: a `setState` call during render like this is what React
  // expects for this exact case, and bails out into a second render before
  // paint rather than committing the stale index.
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setSelectedIndex(0);
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const grouped = useMemo(() => {
    return CATEGORY_ORDER.map((category) => {
      const inCategory = commands.filter((c) => c.category === category);
      const matches = fuzzyFilter(inCategory, query, (c) =>
        [c.label, c.sublabel, ...(c.keywords ?? [])].filter(Boolean).join(" "),
      );
      return { category, commands: matches.map((m) => m.item) };
    }).filter((g) => g.commands.length > 0);
  }, [commands, query]);

  const flatResults = useMemo(() => grouped.flatMap((g) => g.commands), [grouped]);

  // Each row needs its position in the flattened `flatResults` list (for
  // arrow-key navigation), but that position must be a plain value baked
  // into this array — not a shared mutable counter closed over by the row
  // buttons below, which would leave every row's `onMouseEnter` pointing at
  // whatever the counter's *final* value ended up being.
  const groupedRows = useMemo(() => {
    let i = -1;
    return grouped.map((g) => ({
      category: g.category,
      rows: g.commands.map((cmd) => ({ cmd, index: ++i })),
    }));
  }, [grouped]);

  const runSelected = () => {
    const cmd = flatResults[selectedIndex];
    if (!cmd) return;
    cmd.onSelect();
    onClose();
  };

  const moveSelection = (delta: number) => {
    if (flatResults.length === 0) return;
    setSelectedIndex((i) => (i + delta + flatResults.length) % flatResults.length);
  };

  return (
    <div
      // Anchored high rather than centered, like most command palettes —
      // leaves room for a long result list to grow downward without the
      // whole panel recentering as it does.
      className="fixed inset-0 z-200 flex items-start justify-center bg-black/65 p-4 pt-[12vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="flex max-h-[60vh] w-[min(560px,92vw)] animate-[fadeUp_0.18s_ease] flex-col overflow-hidden rounded-lg border-2 border-app-border-mid bg-app-panel"
      >
        <div className="shrink-0 border-b border-app-border p-2.5">
          <Input
            ref={inputRef}
            icon={Search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                moveSelection(1);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                moveSelection(-1);
              } else if (e.key === "Enter") {
                e.preventDefault();
                runSelected();
              }
            }}
            placeholder="Search actions, examples, requests, environments…"
            aria-label="Search commands"
            data-testid="command-palette-input"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-1.5">
          {groupedRows.map(({ category, rows }) => (
            <div key={category} className="mb-1 last:mb-0">
              <div className={`${ui.label} px-2 py-1.5`}>{category}</div>
              {rows.map(({ cmd, index }) => {
                const isSelected = index === selectedIndex;
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    data-selected={isSelected || undefined}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => {
                      cmd.onSelect();
                      onClose();
                    }}
                    className={`${ui.row} mb-0.5`}
                  >
                    <span className="flex w-9 shrink-0 justify-center">
                      {cmd.method ? (
                        <MethodPill method={cmd.method} sm focusable={false} />
                      ) : Icon ? (
                        <Icon size={14} className="text-app-dim" aria-hidden="true" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-app-text">
                      {cmd.label}
                    </span>
                    {cmd.sublabel && (
                      <span className="shrink-0 truncate text-[11px] text-app-dim">
                        {cmd.sublabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-app-border px-3 py-2 text-[11px] text-app-dim">
          <span className="flex items-center gap-1">
            <kbd className={KEY_CAP}>↑↓</kbd> Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className={KEY_CAP}>↵</kbd> Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className={KEY_CAP}>Esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
}
