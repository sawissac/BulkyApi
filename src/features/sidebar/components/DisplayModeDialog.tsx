"use client";

import { useEffect, useRef, useState } from "react";
import { AppWindow, Check, LaptopMinimal, X } from "lucide-react";
import type { DisplayMode } from "@/store/uiSlice";

const OPTIONS: Array<{
  id: DisplayMode;
  label: string;
  detail: string;
  Icon: React.ElementType;
}> = [
  {
    id: "fullscreen",
    label: "Fullscreen view",
    detail:
      "App fills the whole display. No address bar, no tabs, no OS chrome.",
    Icon: LaptopMinimal,
  },
  {
    id: "browser",
    label: "URL view",
    detail:
      "Ordinary browser window, with the address bar and tab strip visible.",
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
 * a tinted fill and a check mark. The two options read as one segmented
 * button group rather than loose items: no option has its own border, and it
 * is the group container's outer `border`+`rounded-lg` plus `divide-y`
 * (colored `app-border`) that draws the frame and the hairline between them.
 * Options round only `first:rounded-t-md last:rounded-b-md`, matching the
 * two corners the group container itself rounds — an interior option (once
 * there are more than two) never sits on an outer corner, so it stays square
 * and its `data-selected` inset ring reads as a flush slice of the list
 * rather than a floating rounded box (see {@link TweaksPanel}'s layout rows,
 * which hit this the moment a third row was added).
 * Done is the footer's solid accent action, Cancel the bordered one.
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
 * @see {@link TweaksPanel}
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
        className="flex w-[min(400px,92vw)] animate-[fadeUp_0.18s_ease] flex-col overflow-hidden rounded-lg border-2 border-app-border-mid bg-app-panel"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-app-border px-3 py-1.5">
          <span className="flex-1 font-title text-[13px] font-semibold tracking-[-0.01em] text-app-bright">
            Display mode
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close display mode picker"
            data-testid="display-mode-dialog-close-button"
            className="flex size-7 items-center justify-center rounded-md border-0 bg-transparent text-app-dim transition-colors duration-200 hover:bg-app-hover hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        <div className="px-3 py-2">
          <div className="flex flex-col divide-y divide-app-border overflow-hidden rounded-lg border border-app-border">
            {OPTIONS.map(({ id, label, detail, Icon }) => (
              <button
                key={id}
                ref={mode === id ? selectedRef : undefined}
                type="button"
                onClick={() => setDraft(id)}
                aria-pressed={draft === id}
                data-selected={draft === id || undefined}
                data-testid={`display-mode-dialog-option-${id}`}
                className="group relative flex items-start gap-2.5 bg-app-hover px-2.5 py-1.5 text-left first:rounded-t-md last:rounded-b-md transition-colors duration-200 hover:bg-app-selected focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-0 data-selected:bg-app-accent-faint data-selected:shadow-[inset_0_0_0_1.5px_var(--app-accent)]"
              >
                <Icon
                  size={15}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-app-dim group-data-selected:text-app-accent"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase leading-tight tracking-[0.07em] text-app-bright">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-app-dim">
                    {detail}
                  </span>
                </span>
                {draft === id && (
                  <Check
                    size={14}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-app-accent"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-app-border px-3 py-1.5">
          <span className="text-[10px] text-app-dim">
            Applies now. Reloading returns to URL view.
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              data-testid="display-mode-dialog-cancel-button"
              className="h-7 rounded-md border border-app-border bg-transparent px-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-app-dim transition-colors duration-200 hover:bg-app-hover hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(draft)}
              data-testid="display-mode-dialog-done-button"
              className="h-7 rounded-md border-0 bg-app-accent px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-app-on-solid transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel"
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
