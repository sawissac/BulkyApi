'use client';

import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Play } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import type { ExampleScript } from '@/lib/sampleData';
import { METHOD_CLR } from '@/lib/themes';

type Props = {
  T: Theme;
  example: ExampleScript;
  onLoad: () => void;
  onClose: () => void;
};

export default function ExampleDialog({ T, example, onLoad, onClose }: Props) {
  const clr = example.method === 'DOCS' ? '#a78bfa' : (METHOD_CLR[example.method] ?? T.textDim);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 'min(680px, 92vw)',
        maxHeight: '80vh',
        background: T.bgPanel,
        border: `1px solid ${T.borderMid}`,
        borderRadius: 14,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        animation: 'fadeUp 0.18s ease',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700,
            color: clr, background: `${clr}18`, border: `1px solid ${clr}30`,
            padding: '2px 7px', borderRadius: 4, flexShrink: 0,
          }}>
            {example.method}
          </span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: T.textBright, flex: 1 }}>
            {example.label}
          </span>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: T.textDim, cursor: 'pointer', padding: 4, display: 'flex', lineHeight: 1 }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body — markdown */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', color: T.text }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ node, ...props }) => (
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: 12, lineHeight: 1.7, color: T.textDim, marginBottom: '1em' }} {...props} />
              ),
              pre: ({ node, ...props }) => (
                <pre style={{ background: T.editorBg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '14px 16px', overflowX: 'auto', marginBottom: '1em' }} {...props} />
              ),
              code: ({ node, className, children, ...props }) => {
                const isBlock = /language-/.test(className ?? '');
                return isBlock ? (
                  <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: T.text, display: 'block' }} {...props}>
                    {children}
                  </code>
                ) : (
                  <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, background: T.bgHover, border: `1px solid ${T.border}`, padding: '1px 5px', borderRadius: 4, color: T.cyan }} {...props}>
                    {children}
                  </code>
                );
              },
              table: ({ node, ...props }) => (
                <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '1em', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }} {...props} />
              ),
              th: ({ node, ...props }) => (
                <th style={{ padding: '5px 10px', borderBottom: `2px solid ${T.borderAccent}`, textAlign: 'left', color: T.cyan, fontWeight: 700 }} {...props} />
              ),
              td: ({ node, ...props }) => (
                <td style={{ padding: '4px 10px', borderBottom: `1px solid ${T.border}`, color: T.textDim }} {...props} />
              ),
            }}
          >
            {example.markdown}
          </ReactMarkdown>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '12px 18px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px', borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: 'transparent',
              color: T.textDim,
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onLoad}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 16px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg,#0891b2,#2563eb)',
              color: 'white',
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(34,211,238,0.25)',
            }}
          >
            <Play size={10} fill="white" />
            Load into Editor
          </button>
        </div>
      </div>
    </div>
  );
}
