"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { X, Play } from "lucide-react";
import type { Theme } from "@/lib/themes";
import type { ExampleScript } from "@/lib/sampleData";
import MethodPill from "@/components/MethodPill";

/** Renderers for every markdown node an example can contain. Kept module-level
 *  so the map is not rebuilt per render, and complete on purpose: any tag left
 *  out falls back to the browser's own stylesheet, which matches nothing else
 *  in the app. */
const MD: Components = {
  h1: (props) => (
    <h1
      className="mb-2 font-title text-[15px] font-semibold tracking-[-0.01em] text-app-bright"
      {...props}
    />
  ),
  h2: (props) => (
    <h2
      className="mb-2 font-title text-[14px] font-semibold tracking-[-0.01em] text-app-bright"
      {...props}
    />
  ),
  h3: (props) => (
    <h3
      className="mt-4 mb-1.5 font-title text-[11px] font-semibold uppercase tracking-[0.08em] text-app-accent-dim"
      {...props}
    />
  ),
  h4: (props) => (
    <h4
      className="mt-3 mb-1 font-title text-[11.5px] font-semibold text-app-bright"
      {...props}
    />
  ),
  p: (props) => (
    <p
      className="mb-3 font-description text-[12px] leading-snug text-app-dim"
      {...props}
    />
  ),
  ul: (props) => (
    <ul
      className="mb-3 ml-4 list-disc space-y-1 font-description text-[12px] leading-snug text-app-dim marker:text-app-accent-dim"
      {...props}
    />
  ),
  ol: (props) => (
    <ol
      className="mb-3 ml-4 list-decimal space-y-1 font-description text-[12px] leading-snug text-app-dim marker:text-app-accent-dim"
      {...props}
    />
  ),
  li: (props) => <li className="pl-0.5" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="mb-3 rounded-md border-l-2 border-app-accent bg-app-accent-faint px-3 py-2 [&>p:last-child]:mb-0"
      {...props}
    />
  ),
  hr: (props) => <hr className="my-4 border-0 border-t border-app-border" {...props} />,
  a: (props) => (
    <a
      target="_blank"
      rel="noreferrer noopener"
      className="text-app-accent underline underline-offset-2 transition-colors duration-200 hover:text-app-bright"
      {...props}
    />
  ),
  strong: (props) => (
    <strong className="font-semibold text-app-bright" {...props} />
  ),
  em: (props) => <em className="italic" {...props} />,
  pre: (props) => (
    <pre
      className="mb-3 overflow-x-auto rounded-md border border-app-border bg-app-editor px-3 py-2.5"
      {...props}
    />
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = /language-/.test(className ?? "");
    return isBlock ? (
      <code className="block font-mono text-[11px] text-app-text" {...props}>
        {children}
      </code>
    ) : (
      <code
        className="rounded-sm border border-app-border bg-app-hover px-1.5 py-px font-mono text-[11px] text-app-accent"
        {...props}
      >
        {children}
      </code>
    );
  },
  // The wrapper, not the table, owns the horizontal scroll: a wide column set
  // scrolls inside its own box instead of stretching the dialog.
  table: (props) => (
    <div className="mb-3 overflow-x-auto rounded-md border border-app-border">
      <table className="w-full border-collapse text-left" {...props} />
    </div>
  ),
  thead: (props) => (
    <thead className="bg-app-hover" {...props} />
  ),
  th: (props) => (
    <th
      className="border-b border-app-border-accent px-2.5 py-1.5 font-title text-[10px] font-semibold uppercase tracking-[0.07em] whitespace-nowrap text-app-accent"
      {...props}
    />
  ),
  tr: (props) => (
    <tr
      className="border-t border-app-border transition-colors duration-200 first:border-t-0 hover:bg-app-hover"
      {...props}
    />
  ),
  td: (props) => (
    <td
      className="px-2.5 py-1.5 align-top font-description text-[11px] leading-snug text-app-dim"
      {...props}
    />
  ),
};

type Props = {
  /** Active theme. Accepted for symmetry with the other dialogs; the markdown
   *  is styled through the `app-*` tokens, so no value is read from it. */
  T: Theme;
  /** Example to preview — its `markdown` is the body, its `code` is what
   *  {@link Props.onLoad} is expected to put in the editor. */
  example: ExampleScript;
  /** Fires when Load into Editor is pressed. The dialog does not close itself
   *  — the parent owns that. */
  onLoad: () => void;
  /** Fires on Cancel, the close button, Escape, and a scrim click. */
  onClose: () => void;
};

/**
 * Modal preview of one example script: its documentation rendered as markdown,
 * with a Load into Editor action.
 *
 * @remarks
 * Status: stable — Type: dialog
 *
 * State & behavior: no local state. One effect closes on Escape, another moves
 * focus to the close button on open so keyboard users are not left behind the
 * scrim. Markdown is rendered by `react-markdown` with `remark-gfm` (tables,
 * strikethrough, autolinks) against the module-level `MD` renderer map, which
 * covers every tag an example can produce — headings, both list kinds,
 * blockquotes, rules, links, emphasis, code, and tables.
 *
 * Variants: none.
 *
 * Composition: renders {@link MethodPill} for the example's method in the
 * header. Tables render inside their own `overflow-x-auto` box, so a wide
 * column set scrolls in place rather than widening the dialog; the body itself
 * scrolls vertically at `70vh`.
 *
 * Accessibility: `role="dialog"` + `aria-modal`, labelled by the example's
 * name. Escape closes; a click on the scrim (and only the scrim) closes.
 * Links open in a new tab with `rel="noreferrer noopener"`.
 *
 * Test ids: none — the dialog is reachable by role and its accessible name,
 * its actions by their labels.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases: focus is moved into the dialog but not trapped — Tab can still
 * reach the page behind it. An example whose markdown is empty renders an
 * empty body, header and footer intact.
 *
 * Dependencies: `react-markdown`, `remark-gfm`, `lucide-react`,
 * `@/components/MethodPill`, `@/lib/sampleData`.
 *
 * @example
 * ```tsx
 * <ExampleDialog
 *   T={theme}
 *   example={EXAMPLE_SCRIPTS[0]}
 *   onLoad={() => dispatch(setCode(example.code))}
 *   onClose={() => setSelected(null)}
 * />
 * ```
 */
export default function ExampleDialog({ example, onLoad, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Move focus into the dialog so keyboard users are not left behind it
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div
      // Solid scrim rather than a backdrop-blur: the flat system has no blur, and
      // 65% black already isolates the foreground.
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/65 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${example.label} example`}
        className="flex max-h-[70vh] w-[min(600px,92vw)] animate-[fadeUp_0.18s_ease] flex-col overflow-hidden rounded-lg border-2 border-app-border-mid bg-app-panel"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-app-border px-4 py-2.5">
          <MethodPill method={example.method} />
          <span className="flex-1 font-title text-[13px] font-semibold tracking-[-0.01em] text-app-bright">
            {example.label}
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close example preview"
            className="flex size-7 items-center justify-center rounded-md border-0 bg-transparent text-app-dim transition-colors duration-200 hover:bg-app-hover hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        {/* Body — markdown */}
        <div className="flex-1 overflow-y-auto px-4 py-3 text-app-text">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>
            {example.markdown}
          </ReactMarkdown>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-app-border px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-app-border bg-transparent px-3.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-app-dim transition-colors duration-200 hover:bg-app-hover hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onLoad}
            className="flex h-8 items-center gap-1.5 rounded-md border-0 bg-app-accent px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-app-on-solid transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel"
          >
            <Play size={12} fill="currentColor" aria-hidden="true" />
            Load into Editor
          </button>
        </div>
      </div>
    </div>
  );
}
