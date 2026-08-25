"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Modal for confirming a destructive action — replaces `window.confirm` with
 * something styled like the rest of the app. Nothing happens until Confirm
 * is pressed; Escape, Cancel, the header close button and a scrim click all
 * discard the action.
 *
 * @remarks
 * Status: stable — Type: overlay
 *
 * State & behavior: stateless. Confirm calls `onConfirm` — the caller is
 * responsible for both performing the action and closing the dialog; this
 * component does not close itself. Focus moves to the close button on mount.
 *
 * Variants: confirm button color is driven by `tone`, defaulting to
 * `--app-error` (red) for destructive confirmations. Non-destructive callers
 * pass the action's own theme accent so red stays reserved for deletions.
 *
 * Composition: renders no children. Fixed to the viewport at `z-200`, the
 * same layer as {@link DisplayModeDialog} and {@link ExampleDialog}.
 *
 * Accessibility: `role="alertdialog"` with `aria-modal` and a label. Escape
 * closes. Focus starts on the close button rather than the destructive
 * action, so Enter-to-confirm is never a keyboard trap.
 *
 * Test ids: root `confirm-dialog-root`, close `confirm-dialog-close-button`,
 * cancel `confirm-dialog-cancel-button`, confirm `confirm-dialog-confirm-button`.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases: none of its own — the caller decides what "confirm" does, so a
 * caller that dispatches nothing on `onConfirm` simply closes with no effect.
 *
 * Dependencies: `lucide-react`.
 *
 * @example
 * ```tsx
 * {pendingDelete && (
 *   <ConfirmDialog
 *     title="Delete collection"
 *     message={`Delete collection "${pendingDelete.name}"? This can't be undone.`}
 *     confirmLabel="Delete"
 *     onConfirm={() => { dispatch(removeCollection(pendingDelete.id)); setPendingDelete(null); }}
 *     onClose={() => setPendingDelete(null)}
 *   />
 * )}
 * ```
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  tone = "var(--app-error)",
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
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

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/65 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        data-testid="confirm-dialog-root"
        className="flex w-[min(380px,92vw)] animate-[fadeUp_0.18s_ease] flex-col overflow-hidden rounded-lg border-2 border-app-border-mid bg-app-panel"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-app-border px-4 py-2.5">
          <span className="flex-1 font-title text-[13px] font-semibold tracking-[-0.01em] text-app-bright">
            {title}
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-testid="confirm-dialog-close-button"
            className="flex size-7 items-center justify-center rounded-md border-0 bg-transparent text-app-dim transition-colors duration-200 hover:bg-app-hover hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        <div className="px-4 py-3">
          <p className="font-description text-[12px] leading-relaxed text-app-dim">{message}</p>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-app-border px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            data-testid="confirm-dialog-cancel-button"
            className="h-8 rounded-md border border-app-border bg-transparent px-3.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-app-dim transition-colors duration-200 hover:bg-app-hover hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-testid="confirm-dialog-confirm-button"
            style={{ backgroundColor: tone, ["--confirm-tone" as string]: tone } as React.CSSProperties}
            className="h-8 rounded-md border-0 px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-app-on-solid transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--confirm-tone) focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export type ConfirmDialogProps = {
  /** Header text naming the action being confirmed. */
  title: string;
  /** Body copy — typically names the specific item being affected. */
  message: string;
  /** Label for the destructive action button.
   * @defaultValue `"Delete"` */
  confirmLabel?: string;
  /** Confirm button color, as a CSS color value. Reserve the default red for
   *  actual data deletion; non-destructive confirmations should pass the
   *  action's own theme accent instead.
   * @defaultValue `"var(--app-error)"` */
  tone?: string;
  /** Fires when the destructive button is pressed. Does not close the
   *  dialog; the caller performs the action and closes it. */
  onConfirm: () => void;
  /** Fires on the header close button, Cancel, a scrim click, and Escape. */
  onClose: () => void;
};
