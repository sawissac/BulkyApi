"use client";

import { useEffect, useRef, useState } from "react";
import { SquareTerminal, X } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Modal prompt for a curl command to import as a script. Enter and the
 * footer's Import button both commit; Escape, Cancel and a scrim click
 * discard the draft. Rendered by {@link FilePane} in place of a native
 * `window.prompt`.
 *
 * @remarks
 * Status: stable — Type: overlay
 *
 * State & behavior: holds the draft command, local only — nothing is
 * dispatched until Import fires. An empty or whitespace-only draft disables
 * Import and does nothing on Enter. Focus moves to the field on mount.
 *
 * Variants: none.
 *
 * Composition: renders no children. Fixed to the viewport at `z-200`, the
 * same layer as {@link DisplayModeDialog} and {@link ExampleDialog}.
 *
 * Accessibility: `role="dialog"` with `aria-modal` and a label. Escape closes.
 *
 * Test ids: root `curl-import-dialog-root`, command field
 * `curl-import-dialog-command-input` (clear button
 * `curl-import-dialog-command-input-clear-button`), close
 * `curl-import-dialog-close-button`, cancel
 * `curl-import-dialog-cancel-button`, confirm
 * `curl-import-dialog-import-button`.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases: a command entered then cleared before submitting still
 * disables Import rather than falling back to a no-op parse.
 *
 * Dependencies: `lucide-react`, `@/components/ui/input` ({@link Input}).
 *
 * @example
 * ```tsx
 * {curlOpen && (
 *   <CurlImportDialog
 *     onImport={(cmd) => { handleCurl(cmd); setCurlOpen(false); }}
 *     onClose={() => setCurlOpen(false)}
 *   />
 * )}
 * ```
 *
 * @see {@link FilePane}
 */
export default function CurlImportDialog({ onImport, onClose }: CurlImportDialogProps) {
  const [command, setCommand] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const commit = () => {
    const v = command.trim();
    if (v) onImport(v);
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
        aria-label="Import from cURL"
        data-testid="curl-import-dialog-root"
        className="flex w-[min(480px,92vw)] animate-[fadeUp_0.18s_ease] flex-col overflow-hidden rounded-lg border-2 border-app-border-mid bg-app-panel"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-app-border px-4 py-2.5">
          <span className="flex-1 font-title text-[13px] font-semibold tracking-[-0.01em] text-app-bright">
            Import from cURL
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close import from cURL dialog"
            data-testid="curl-import-dialog-close-button"
            className="flex size-7 items-center justify-center rounded-md border-0 bg-transparent text-app-dim transition-colors duration-200 hover:bg-app-hover hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        <div className="px-4 py-3">
          <Input
            ref={inputRef}
            icon={SquareTerminal}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
            }}
            placeholder="Paste a curl command…"
            aria-label="Curl command"
            data-testid="curl-import-dialog-command-input"
            className="h-8"
          />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-app-border px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            data-testid="curl-import-dialog-cancel-button"
            className="h-8 rounded-md border border-app-border bg-transparent px-3.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-app-dim transition-colors duration-200 hover:bg-app-hover hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={commit}
            disabled={!command.trim()}
            data-testid="curl-import-dialog-import-button"
            className="h-8 rounded-md border-0 bg-app-accent px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-app-on-solid transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel disabled:pointer-events-none disabled:opacity-50"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

export type CurlImportDialogProps = {
  /** Fires when Import is pressed (or Enter in the field) with a trimmed,
   *  non-empty curl command. Does not close the dialog; the caller does that. */
  onImport: (command: string) => void;
  /** Fires on the header close button, Cancel, a scrim click, and Escape. */
  onClose: () => void;
};
