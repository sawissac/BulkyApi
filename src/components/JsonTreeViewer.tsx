'use client';

import { useState } from 'react';
import type { Theme } from '@/lib/themes';

type JNodeProps = {
  data: unknown;
  depth?: number;
  T: Theme;
};

export default function JNode({ data, depth = 0, T }: JNodeProps) {
  const [open, setOpen] = useState(depth < 2);

  if (data === null) return <span style={{ color: '#64748b' }}>null</span>;
  if (typeof data === 'boolean') return <span style={{ color: '#a78bfa' }}>{String(data)}</span>;
  if (typeof data === 'number') return <span style={{ color: '#34d399' }}>{data}</span>;
  if (typeof data === 'string') {
    const display = data.length > 120 ? data.slice(0, 120) + '…' : data;
    return <span style={{ color: '#fbbf24' }}>"{display}"</span>;
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
            <div key={i} style={{ paddingLeft: 14 }}>
              {!isArr && (
                <>
                  <span style={{ color: '#67e8f9' }}>{item as string}</span>
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
