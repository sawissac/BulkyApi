"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { Download, FolderPlus } from "lucide-react";
import { addCollection, importCollections } from "@/store/collectionsSlice";
import NewCollectionDialog from "@/features/sidebar/components/NewCollectionDialog";
import ImportCollectionDialog from "@/features/sidebar/components/ImportCollectionDialog";

/** Start-list entry: a borderless row that reads as a link, tinting on
 *  hover/focus the same way the editor footer's tool buttons do. */
const START_BTN =
  "flex w-full items-center gap-2.5 rounded-md border-0 bg-transparent px-2.5 py-2 text-left text-[13px] text-app-accent transition-colors duration-200 " +
  "hover:bg-app-accent-faint focus-visible:bg-app-accent-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-accent";

const SECTION_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.1em] text-app-dim";

const KEY_CAP =
  "rounded border border-app-border-mid bg-app-hover px-1.5 py-0.5 font-mono text-[10px] text-app-dim";

const SHORTCUTS = [
  { keys: "⌘↵", label: "Run script" },
  { keys: "⇧⌥F", label: "Format document" },
] as const;

/**
 * The editor pane's welcome screen, shown in place of the toolbar, Monaco
 * instance and status bar while no collection exists at all. Offers the two
 * ways out of that state — create a collection or import one — so the pane
 * is never an empty buffer with nothing to run. Rendered only by
 * {@link CodeEditor}; once any collection exists the real editor takes over,
 * even before a request is selected.
 *
 * @remarks
 * Status: stable — Type: panel
 *
 * State & behavior: `newOpen` and `importOpen` each gate one dialog; both
 * dispatch on confirm and close themselves, so this component holds no
 * draft. Import accepts either a single collection object or an array and
 * dispatches `importCollections` with the array form.
 *
 * Variants: none.
 *
 * Composition: renders {@link NewCollectionDialog} and
 * {@link ImportCollectionDialog} on demand, mirroring the pair
 * {@link CollPane} owns in the sidebar. Requires the Redux store provider.
 *
 * Accessibility: the two start entries are plain buttons reachable by role
 * and name; the shortcut list is decorative text, marked `aria-hidden`.
 * Both dialogs supply their own modal semantics and Escape handling.
 *
 * Test ids: root `editor-empty-state-root`, new collection
 * `editor-empty-state-new-collection-button`, import
 * `editor-empty-state-import-collection-button`.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases: importing a file whose JSON is not a collection shape still
 * dispatches — validation lives in the reducer's tolerance, not here, same
 * as the sidebar path.
 *
 * Dependencies: `lucide-react`, `react-redux`, `/favicon.svg` (app icon, same
 * mark {@link ActivityRail} renders), `@/store/collectionsSlice`,
 * `@/features/sidebar/components/NewCollectionDialog`,
 * `@/features/sidebar/components/ImportCollectionDialog`.
 *
 * @example
 * ```tsx
 * {collections.length === 0 ? <EditorEmptyState /> : <CodeEditorBody />}
 * ```
 *
 * @see {@link CodeEditor}
 * @see {@link CollPane}
 */
export default function EditorEmptyState() {
  const dispatch = useDispatch();
  const [newOpen, setNewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div
      data-testid="editor-empty-state-root"
      className="flex h-full w-full min-w-0 flex-col items-center justify-center overflow-auto bg-app-editor px-6 py-10"
    >
      <div className="flex w-full max-w-[380px] flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-2 font-title text-[20px] font-semibold tracking-[-0.02em] text-app-bright">
            <img
              src="/favicon.svg"
              alt=""
              width={22}
              height={22}
              className="shrink-0 rounded-md"
              aria-hidden="true"
            />
            BulkyApi
          </span>
          <p className="text-[12px] leading-relaxed text-app-dim">
            No collection yet. Create one to start writing requests, or import
            a collection you already have.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <span className={SECTION_LABEL}>Start</span>
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            data-testid="editor-empty-state-new-collection-button"
            className={START_BTN}
          >
            <FolderPlus size={14} className="shrink-0" aria-hidden="true" />
            New collection
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            data-testid="editor-empty-state-import-collection-button"
            className={START_BTN}
          >
            <Download size={14} className="shrink-0" aria-hidden="true" />
            Import collection
          </button>
        </div>

        <div className="flex flex-col gap-1.5" aria-hidden="true">
          <span className={SECTION_LABEL}>Shortcuts</span>
          {SHORTCUTS.map((s) => (
            <span
              key={s.keys}
              className="flex items-center gap-2 text-[12px] text-app-dim"
            >
              <kbd className={KEY_CAP}>{s.keys}</kbd>
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {newOpen && (
        <NewCollectionDialog
          onCreate={(name) => {
            dispatch(addCollection(name));
            setNewOpen(false);
          }}
          onClose={() => setNewOpen(false)}
        />
      )}

      {importOpen && (
        <ImportCollectionDialog
          onImport={(json) => {
            dispatch(importCollections(Array.isArray(json) ? json : [json]));
            setImportOpen(false);
          }}
          onClose={() => setImportOpen(false)}
        />
      )}
    </div>
  );
}
