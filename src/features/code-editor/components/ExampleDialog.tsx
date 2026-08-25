'use client';

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Play } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import type { ExampleScript } from '@/lib/sampleData';
import MethodPill from '@/components/MethodPill';

type Props = {
  T: Theme;
  example: ExampleScript;
  onLoad: () => void;
  onClose: () => void;
};

export default function ExampleDialog({ example, onLoad, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Move focus into the dialog so keyboard users are not left behind it
  useEffect(() => { closeRef.current?.focus(); }, []);

  return (
    <div
      // Solid scrim rather than a backdrop-blur: the flat system has no blur, and
      // 65% black already isolates the foreground.
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/65 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
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
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: (props) => (
                <p className="mb-3 font-description text-[12px] leading-snug text-app-dim" {...props} />
              ),
              pre: (props) => (
                <pre className="mb-3 overflow-x-auto rounded-md border border-app-border bg-app-editor px-3 py-2.5" {...props} />
              ),
              code: ({ className, children, ...props }) => {
                const isBlock = /language-/.test(className ?? '');
                return isBlock ? (
                  <code className="block font-mono text-[11px] text-app-text" {...props}>
                    {children}
                  </code>
                ) : (
                  <code className="rounded-sm border border-app-border bg-app-hover px-1.5 py-px font-mono text-[11px] text-app-accent" {...props}>
                    {children}
                  </code>
                );
              },
              table: (props) => (
                <table className="mb-3 w-full border-collapse font-mono text-[11px]" {...props} />
              ),
              th: (props) => (
                <th className="border-b-2 border-app-border-accent px-2 py-1 text-left font-bold text-app-accent" {...props} />
              ),
              td: (props) => (
                <td className="border-b border-app-border px-2 py-0.5 text-app-dim" {...props} />
              ),
            }}
          >
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
