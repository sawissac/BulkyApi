'use client';

import { useState } from 'react';
import type { Theme } from '@/lib/themes';

type JNodeProps = {
  data: unknown;
  depth?: number;
  T: Theme;
};

/**
 * Syntax colors for the tree. The dark set is the original palette; the light
 * set swaps in darker equivalents so keys / strings / numbers clear WCAG AA on
 * a pale panel instead of washing out (the dark values sat near ~1.5:1 there).
 */
const SYNTAX = {
  dark: { key: '#67e8f9', string: '#fbbf24', number: '#34d399', boolean: '#a78bfa', null: '#64748b' },
  light: { key: '#0e7490', string: '#047857', number: '#9a3412', boolean: '#6d28d9', null: '#57534e' },
} as const;

export default function JNode({ data, depth = 0, T }: JNodeProps) {
  const [open, setOpen] = useState(depth < 2);
  const clr = T.isLight ? SYNTAX.light : SYNTAX.dark;

  if (data === null) return <span style={{ color: clr.null }}>null</span>;
  if (typeof data === 'boolean') return <span style={{ color: clr.boolean }}>{String(data)}</span>;
  if (typeof data === 'number') return <span style={{ color: clr.number }}>{data}</span>;
  if (typeof data === 'string') {
    const display = data.length > 120 ? data.slice(0, 120) + '…' : data;
    return (
      <span style={{ color: clr.string, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
        &quot;{display}&quot;
      </span>
    );
  }

  const isArr = Array.isArray(data);
  const keys = isArr ? (data as unknown[]) : Object.keys(data as object);
  const len = keys.length;

  if (len === 0) return <span style={{ color: T.textDim }}>{isArr ? '[]' : '{}'}</span>;

  return (
    <span>
      <span
        style={{ color: T.cyan, cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen(!open)}
      >
        {open ? (isArr ? '▼ [' : '▼ {') : `▶ ${isArr ? `[${len}]` : `{${len}}`}`}
      </span>
      {open && (
        <>
          {(isArr ? (data as unknown[]) : Object.keys(data as object)).map((item, i) => (
            <div key={i} style={{ paddingLeft: 14, overflowWrap: 'anywhere' }}>
              {!isArr && (
                <>
                  <span style={{ color: clr.key }}>{item as string}</span>
                  <span style={{ color: T.textDim }}>: </span>
                </>
              )}
              <JNode
                data={isArr ? item : (data as Record<string, unknown>)[item as string]}
                depth={depth + 1}
                T={T}
              />
              {i < len - 1 && <span style={{ color: T.textDim }}>,</span>}
            </div>
          ))}
          <span style={{ color: T.cyan }}>{isArr ? ']' : '}'}</span>
        </>
      )}
    </span>
  );
}
