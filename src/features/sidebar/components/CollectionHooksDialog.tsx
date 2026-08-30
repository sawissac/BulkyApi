"use client";

import { useEffect, useRef, useState } from "react";
import { Workflow, X } from "lucide-react";

/** Mono code field shared by both hook editors — muted fill, hard accent
 *  border on focus, no resize handle (the dialog sizes it). */
const FIELD =
  "min-h-[150px] w-full resize-none rounded-md border-2 border-transparent bg-app-hover px-2.5 py-2 " +
  "font-mono text-[12px] leading-relaxed text-app-bright outline-none transition-colors duration-200 " +
  "placeholder:text-app-dim focus:border-app-accent focus:bg-app-panel";

/**
 * Modal editor for a collection's pre-run and post-run hook scripts — the
 * setup/teardown that wraps every run of every request in the collection.
 * Rendered by {@link CollPane} from the per-collection "run hooks" control.
 * For editing a single request's own script use the main editor, not this.
 *
 * @remarks
 * Status: stable — Type: overlay
 *
 * State & behavior: holds a draft of each field, seeded from `preRun` /
 * `postRun` on mount, local only — nothing leaves the dialog until Save,
 * which fires `onSave` with both trimmed-or-raw drafts and leaves closing to
 * the caller. Escape, Cancel, the close button and a scrim click discard the
 * drafts. Save is always enabled — clearing a field and saving is how a hook
 * is removed. Focus moves to the pre-run field on mount.
 *
 * Variants: none — both fields always render.
 *
 * Composition: renders no children. Fixed to the viewport at `z-200`, the
 * same layer as {@link NewCollectionDialog} and {@link ImportCollectionDialog}.
 *
 * Accessibility: `role="dialog"` with `aria-modal` and a label naming the
 * collection. Each field has a visible label wired by `htmlFor`/`id` plus a
 * short description. Escape closes.
 *
 * Test ids: root `collection-hooks-dialog-root`, pre-run field
 * `collection-hooks-dialog-pre-run-input`, post-run field
 * `collection-hooks-dialog-post-run-input`, close
 * `collection-hooks-dialog-close-button`, cancel
 * `collection-hooks-dialog-cancel-button`, save
 * `collection-hooks-dialog-save-button`.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases: a hook left blank (or whitespace-only) is treated as absent by
 * `composeScript` and contributes no block to the run. Reopening the dialog
 * always reseeds from the saved values, so a discarded edit does not linger.
 *
 * Dependencies: `lucide-react`.
 *
 * @example
 * ```tsx
 * {hooksFor && (
 *   <CollectionHooksDialog
 *     collectionName={hooksFor.name}
 *     preRun={hooksFor.preRun ?? ""}
 *     postRun={hooksFor.postRun ?? ""}
 *     onSave={({ preRun, postRun }) => {
 *       dispatch(setCollectionHook({ collectionId: hooksFor.id, hook: "preRun", code: preRun }));
 *       dispatch(setCollectionHook({ collectionId: hooksFor.id, hook: "postRun", code: postRun }));
 *       setHooksFor(null);
 *     }}
 *     onClose={() => setHooksFor(null)}
 *   />
 * )}
 * ```
 *
 * @see {@link CollPane}
 */
export default function CollectionHooksDialog({
  collectionName,
  preRun,
  postRun,
  onSave,
  onClose,
}: CollectionHooksDialogProps) {
  const [pre, setPre] = useState(preRun);
  const [post, setPost] = useState(postRun);
  const preRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    preRef.current?.focus();
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
        aria-label={`Run hooks for ${collectionName}`}
        data-testid="collection-hooks-dialog-root"
        className="flex w-[min(640px,94vw)] animate-[fadeUp_0.18s_ease] flex-col overflow-hidden rounded-lg border-2 border-app-border-mid bg-app-panel"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-app-border px-4 py-2.5">
          <Workflow size={14} className="shrink-0 text-app-accent-dim" aria-hidden="true" />
          <span className="flex-1 truncate font-title text-[13px] font-semibold tracking-[-0.01em] text-app-bright">
            {collectionName} · run hooks
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close run hooks dialog"
            data-testid="collection-hooks-dialog-close-button"
            className="flex size-7 items-center justify-center rounded-md border-0 bg-transparent text-app-dim transition-colors duration-200 hover:bg-app-hover hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-4 py-3">
          <p className="font-description text-[11px] leading-relaxed text-app-dim">
            Both scripts run around <em>every</em> request in this collection —
            pre-run first (auth once, seed data), post-run last (cleanup). Pass
            data to the request script with{" "}
            <code className="font-mono text-app-accent-dim">env.set()</code>;
            local variables do not cross between them.
          </p>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="collection-hooks-pre-run"
              className="font-title text-[11px] font-semibold uppercase tracking-[0.07em] text-app-dim"
            >
              Pre-run
            </label>
            <textarea
              ref={preRef}
              id="collection-hooks-pre-run"
              value={pre}
              onChange={(e) => setPre(e.target.value)}
              spellCheck={false}
              placeholder="// const r = await api.post(env.baseUrl + '/login', creds); env.set('token', r.data.token);"
              aria-describedby="collection-hooks-pre-run-desc"
              data-testid="collection-hooks-dialog-pre-run-input"
              className={FIELD}
            />
            <span id="collection-hooks-pre-run-desc" className="font-description text-[10px] text-app-dim">
              Runs before the request script.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="collection-hooks-post-run"
              className="font-title text-[11px] font-semibold uppercase tracking-[0.07em] text-app-dim"
            >
              Post-run
            </label>
            <textarea
              id="collection-hooks-post-run"
              value={post}
              onChange={(e) => setPost(e.target.value)}
              spellCheck={false}
              placeholder="// e.g. await api.delete(env.baseUrl + '/seed/' + env.get('seedId'));"
              aria-describedby="collection-hooks-post-run-desc"
              data-testid="collection-hooks-dialog-post-run-input"
              className={FIELD}
            />
            <span id="collection-hooks-post-run-desc" className="font-description text-[10px] text-app-dim">
              Runs after the request script. A throw in the request script may skip it.
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-app-border px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            data-testid="collection-hooks-dialog-cancel-button"
            className="h-8 rounded-md border border-app-border bg-transparent px-3.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-app-dim transition-colors duration-200 hover:bg-app-hover hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave({ preRun: pre, postRun: post })}
            data-testid="collection-hooks-dialog-save-button"
            className="h-8 rounded-md border-0 bg-app-accent px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-app-on-solid transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export type CollectionHooksDialogProps = {
  /** Collection whose hooks are being edited — shown in the title and the
   *  dialog's accessible name. Not parsed. */
  collectionName: string;
  /** Initial pre-run script; seeds the field on mount and on every reopen. */
  preRun: string;
  /** Initial post-run script; seeds the field on mount and on every reopen. */
  postRun: string;
  /** Fires when Save is pressed, with the current drafts of both fields
   *  (verbatim, not trimmed). Does not close the dialog; the caller does.
   *  @param hooks - `{ preRun, postRun }` draft strings, either possibly
   *  empty to clear that hook */
  onSave: (hooks: { preRun: string; postRun: string }) => void;
  /** Fires on the header close button, Cancel, a scrim click, and Escape. */
  onClose: () => void;
};
