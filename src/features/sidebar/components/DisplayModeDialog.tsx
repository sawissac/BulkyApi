"use client";

import { useEffect, useRef, useState } from "react";
import { AppWindow, Check, Maximize2, X } from "lucide-react";
import type { DisplayMode } from "@/store/uiSlice";

const OPTIONS: Array<{
  id: DisplayMode;
  label: string;
  detail: string;
  Icon: React.ElementType;
}> = [
  {
    id: "fullscreen",
    label: "Fullscreen\nview",
    detail: "App fills the whole display. No address bar, no tabs, no OS chrome.",
    Icon: Maximize2,
  },
  {
    id: "browser",
    label: "URL view",
    detail: "Ordinary browser window, with the address bar and tab strip visible.",
    Icon: AppWindow,
  },
];

/**
 * Modal picker for how the app occupies the screen: fullscreen, or a normal
 * browser window with the URL bar. Choosing an option only marks it — nothing
 * changes until Done is pressed, so the user can look at both before
 * committing. Rendered by {@link ActivityRail} when the laptop control is
 * pressed; it renders nothing on its own, so the caller mounts it
 * conditionally.
 *
 * @remarks
 * Status: stable — Type: overlay
 *
 * State & behavior: holds the pending choice, seeded once from `mode`; the
 * store is never touched here. Pressing an option updates that draft and
 * nothing else. Done sends the draft through `onConfirm`; Cancel, Escape and a
 * click on the scrim call `onClose` and the draft is dropped. Focus moves to
 * the active option on mount, so the keyboard lands inside the dialog rather
 * than behind it.
 *
 * Variants: each option renders selected or unselected — the pending one gets
 * the accent border, tinted fill and a check mark. Done is the footer's solid
 * accent action, Cancel the bordered one.
 *
 * Composition: renders no children. Fixed to the viewport at `z-200`, above the
 * tweaks panel.
 *
 * Accessibility: `role="dialog"` with `aria-modal` and a label. Options are
 * plain buttons carrying `aria-pressed` for their selected state. Escape closes.
 * Unverified: focus is not trapped inside the dialog — Tab can still reach the
 * page behind it, the same as {@link ExampleDialog}.
 *
 * Test ids: root `display-mode-dialog-root`, options
 * `display-mode-dialog-option-<mode>`, close `display-mode-dialog-close-button`,
 * cancel `display-mode-dialog-cancel-button`, confirm
 * `display-mode-dialog-done-button`.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases:
 * - A fullscreen request the browser refuses leaves the app in URL view; the
 *   dialog reflects whatever the caller passes back as `mode` next time it opens.
 * - An unknown `mode` value renders both options unselected until one is picked.
 * - `mode` changing while the dialog is open does not disturb the draft — the
 *   seed is read once, on mount.
 *
 * Dependencies: `lucide-react`.
 *
 * @example
 * ```tsx
 * {pickerOpen && (
 *   <DisplayModeDialog
 *     mode={mode}
 *     onConfirm={(next) => { void apply(next); setPickerOpen(false); }}
 *     onClose={() => setPickerOpen(false)}
 *   />
 * )}
 * ```
 *
 * @see {@link ActivityRail}
 */
export default function DisplayModeDialog({
  mode,
  onConfirm,
  onClose,
}: DisplayModeDialogProps) {
  const [draft, setDraft] = useState<DisplayMode>(mode);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    selectedRef.current?.focus();
  }, []);

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
        aria-label="Choose display mode"
        data-testid="display-mode-dialog-root"
        className="flex w-[min(460px,92vw)] animate-[fadeUp_0.18s_ease] flex-col overflow-hidden rounded-lg border-2 border-app-border-mid bg-app-panel"
      >
        <div className="flex shrink-0 items-center gap-2.5 border-b border-app-border px-5 py-3.5">
          <span className="flex-1 text-[15px] font-bold tracking-[-0.01em] text-app-bright">
            Display mode
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close display mode picker"
            data-testid="display-mode-dialog-close-button"
            className="flex size-8 items-center justify-center rounded-md border-0 bg-transparent text-app-dim transition-colors duration-200 hover:bg-app-hover hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-2 px-5 py-4">
          {OPTIONS.map(({ id, label, detail, Icon }) => (
            <button
              key={id}
              ref={mode === id ? selectedRef : undefined}
              type="button"
              onClick={() => setDraft(id)}
              aria-pressed={draft === id}
              data-selected={draft === id || undefined}
              data-testid={`display-mode-dialog-option-${id}`}
              className="group flex items-start gap-3 rounded-md border border-app-border bg-transparent px-3.5 py-3 text-left transition-colors duration-200 hover:border-app-border-accent hover:bg-app-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel data-selected:border-app-border-accent data-selected:bg-app-accent-faint"
            >
              <Icon
                size={16}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-app-dim group-data-selected:text-app-accent"
              />
              <span className="min-w-0 flex-1">
                <span className="block whitespace-pre-line text-[12px] font-semibold uppercase leading-tight tracking-[0.07em] text-app-bright">
                  {label}
                </span>
                <span className="mt-1 block text-[12px] leading-relaxed text-app-dim">
                  {detail}
                </span>
              </span>
              {draft === id && (
                <Check
                  size={15}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-app-accent"
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-app-border px-5 py-3">
          <span className="text-[11px] text-app-dim">
            Applies now. Reloading returns to URL view.
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              data-testid="display-mode-dialog-cancel-button"
              className="h-9 rounded-md border border-app-border bg-transparent px-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-app-dim transition-colors duration-200 hover:bg-app-hover hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(draft)}
              data-testid="display-mode-dialog-done-button"
              className="h-9 rounded-md border-0 bg-app-accent px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-app-on-solid transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type DisplayModeDialogProps = {
  /** Mode currently in force. Seeds the pending choice when the dialog mounts. */
  mode: DisplayMode;
  /**
   * Fires only when Done is pressed, with the option showing as selected at
   * that moment — including when it is the one already in force. Pressing an
   * option does not fire it. Does not close the dialog; the caller does that.
   * @param mode - the option the user committed to
   */
  onConfirm: (mode: DisplayMode) => void;
  /**
   * Fires on the header close button, the Cancel button, a click on the scrim,
   * and Escape. The pending choice is discarded.
   */
  onClose: () => void;
};
