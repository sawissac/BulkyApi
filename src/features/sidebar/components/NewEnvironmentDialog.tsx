"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Modal prompt for a new environment's name. Enter and the footer's Create
 * button both commit; Escape, Cancel and a scrim click discard the draft.
 * Rendered by {@link EnvPane} when its "Add environment" control is pressed.
 *
 * @remarks
 * Status: stable — Type: overlay
 *
 * State & behavior: holds the draft name, local only — nothing is dispatched
 * until Create fires. An empty or whitespace-only draft disables Create and
 * does nothing on Enter. Focus moves to the name field on mount.
 *
 * Variants: none.
 *
 * Composition: renders no children. Fixed to the viewport at `z-200`, the
 * same layer as {@link ConfirmDialog} and {@link NewCollectionDialog}.
 *
 * Accessibility: `role="dialog"` with `aria-modal` and a label. Escape closes.
 *
 * Test ids: root `new-environment-dialog-root`, name field
 * `new-environment-dialog-name-input` (clear button
 * `new-environment-dialog-name-input-clear-button`), close
 * `new-environment-dialog-close-button`, cancel
 * `new-environment-dialog-cancel-button`, confirm
 * `new-environment-dialog-create-button`.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases: a name entered then cleared before submitting still disables
 * Create rather than falling back to a placeholder name.
 *
 * Dependencies: `lucide-react`, `@/components/ui/input` ({@link Input}).
 *
 * @example
 * ```tsx
 * {newEnvOpen && (
 *   <NewEnvironmentDialog
 *     onCreate={(name) => { dispatch(addEnvironment({ collectionId: activeCol.id, name })); setNewEnvOpen(false); }}
 *     onClose={() => setNewEnvOpen(false)}
 *   />
 * )}
 * ```
 *
 * @see {@link EnvPane}
 */
export default function NewEnvironmentDialog({ onCreate, onClose }: NewEnvironmentDialogProps) {
  const [name, setName] = useState("");
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
    const v = name.trim();
    if (v) onCreate(v);
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
        aria-label="New environment"
        data-testid="new-environment-dialog-root"
        className="flex w-[min(380px,92vw)] animate-[fadeUp_0.18s_ease] flex-col overflow-hidden rounded-lg border-2 border-app-border-mid bg-app-panel"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-app-border px-4 py-2.5">
          <span className="flex-1 font-title text-[13px] font-semibold tracking-[-0.01em] text-app-bright">
            New environment
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close new environment dialog"
            data-testid="new-environment-dialog-close-button"
            className="flex size-7 items-center justify-center rounded-md border-0 bg-transparent text-app-dim transition-colors duration-200 hover:bg-app-hover hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        <div className="px-4 py-3">
          <Input
            ref={inputRef}
            icon={Plus}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
            }}
            placeholder="Environment name…"
            aria-label="Environment name"
            data-testid="new-environment-dialog-name-input"
            className="h-8"
          />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-app-border px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            data-testid="new-environment-dialog-cancel-button"
            className="h-8 rounded-md border border-app-border bg-transparent px-3.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-app-dim transition-colors duration-200 hover:bg-app-hover hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={commit}
            disabled={!name.trim()}
            data-testid="new-environment-dialog-create-button"
            className="h-8 rounded-md border-0 bg-app-accent px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-app-on-solid transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel disabled:pointer-events-none disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

export type NewEnvironmentDialogProps = {
  /** Fires when Create is pressed (or Enter in the field) with a trimmed,
   *  non-empty name. Does not close the dialog; the caller does that. */
  onCreate: (name: string) => void;
  /** Fires on the header close button, Cancel, a scrim click, and Escape. */
  onClose: () => void;
};
