"use client";

import { useEffect, useRef, useState } from "react";
import { FileJson, Upload, X } from "lucide-react";
import { pickFile, readFileText } from "@/lib/fileUtils";

/**
 * Modal for loading a collections JSON export back in. Picking a file parses
 * it immediately so a malformed file surfaces its error before Import is
 * pressed, rather than after. Rendered by {@link CollPane} when its "Import
 * collection" control is pressed.
 *
 * @remarks
 * Status: stable — Type: overlay
 *
 * State & behavior: holds the picked file's name and its parsed JSON (or a
 * parse error), all local — nothing is dispatched until Import is pressed.
 * "Choose file" opens the OS file picker via `pickFile`; a chosen file is
 * read and parsed right away. Import is disabled until a file has parsed
 * cleanly. Focus moves to the close button on mount.
 *
 * Variants:
 * - empty — no file chosen yet, Import disabled.
 * - parsed — filename shown, Import enabled.
 * - invalid — parse error shown in place of the filename, Import disabled.
 *
 * Composition: renders no children. Fixed to the viewport at `z-200`, the
 * same layer as {@link DisplayModeDialog} and {@link ExampleDialog}.
 *
 * Accessibility: `role="dialog"` with `aria-modal` and a label. Escape closes.
 *
 * Test ids: root `import-collection-dialog-root`, choose file
 * `import-collection-dialog-choose-button`, close
 * `import-collection-dialog-close-button`, cancel
 * `import-collection-dialog-cancel-button`, confirm
 * `import-collection-dialog-import-button`.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases:
 * - Cancelling the OS file picker (no file chosen) leaves the dialog exactly
 *   as it was — no error, no change to any previously parsed file.
 * - Choosing a second file after an error replaces the error with the new
 *   file's own result.
 *
 * Dependencies: `lucide-react`, `@/lib/fileUtils` (`pickFile`, `readFileText`).
 *
 * @example
 * ```tsx
 * {importOpen && (
 *   <ImportCollectionDialog
 *     onImport={(json) => { dispatch(importCollections(Array.isArray(json) ? json : [json])); setImportOpen(false); }}
 *     onClose={() => setImportOpen(false)}
 *   />
 * )}
 * ```
 *
 * @see {@link CollPane}
 */
export default function ImportCollectionDialog({ onImport, onClose }: ImportCollectionDialogProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const handleChoose = async () => {
    const file = await pickFile(".json,application/json");
    if (!file) return;
    try {
      const text = await readFileText(file);
      setParsed(JSON.parse(text));
      setFileName(file.name);
      setError(null);
    } catch {
      setParsed(null);
      setFileName(null);
      setError("Could not parse that file as JSON.");
    }
  };

  const commit = () => {
    if (parsed !== null) onImport(parsed);
  };

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/65 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Import collection"
        data-testid="import-collection-dialog-root"
        className="flex w-[min(420px,92vw)] animate-[fadeUp_0.18s_ease] flex-col overflow-hidden rounded-lg border-2 border-app-border-mid bg-app-panel"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-app-border px-4 py-2.5">
          <span className="flex-1 font-title text-[13px] font-semibold tracking-[-0.01em] text-app-bright">
            Import collection
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close import collection dialog"
            data-testid="import-collection-dialog-close-button"
            className="flex size-7 items-center justify-center rounded-md border-0 bg-transparent text-app-dim transition-colors duration-200 hover:bg-app-hover hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-2.5 px-4 py-3">
          <button
            type="button"
            onClick={handleChoose}
            data-testid="import-collection-dialog-choose-button"
            className="flex h-9 items-center justify-center gap-2 rounded-md border border-dashed border-app-border bg-app-hover text-[11px] font-semibold uppercase tracking-[0.07em] text-app-dim transition-colors duration-200 hover:border-app-border-accent hover:text-app-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel"
          >
            <Upload size={13} aria-hidden="true" />
            Choose file…
          </button>

          {fileName && (
            <div className="flex items-center gap-2 rounded-md border border-app-border bg-app-hover px-2.5 py-2">
              <FileJson size={13} className="shrink-0 text-app-accent-dim" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-app-dim">
                {fileName}
              </span>
            </div>
          )}

          {error && (
            <p className="text-[11px] text-app-error">{error}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-app-border px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            data-testid="import-collection-dialog-cancel-button"
            className="h-8 rounded-md border border-app-border bg-transparent px-3.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-app-dim transition-colors duration-200 hover:bg-app-hover hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={commit}
            disabled={parsed === null}
            data-testid="import-collection-dialog-import-button"
            className="h-8 rounded-md border-0 bg-app-accent px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-app-on-solid transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel disabled:pointer-events-none disabled:opacity-50"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

export type ImportCollectionDialogProps = {
  /** Fires when Import is pressed, with the parsed JSON from the chosen
   *  file — an array or a single collection object, unvalidated beyond that
   *  it parsed. Does not close the dialog; the caller does that. */
  onImport: (json: unknown) => void;
  /** Fires on the header close button, Cancel, a scrim click, and Escape. */
  onClose: () => void;
};
