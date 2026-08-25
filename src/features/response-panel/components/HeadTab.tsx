'use client';

import type { Theme } from '@/lib/themes';
import KVRow from '@/components/KVRow';

type Props = { T: Theme; headers: Record<string, string> };

export default function HeadTab({ T, headers }: Props) {
  if (Object.keys(headers).length === 0) {
    return <span style={{ fontFamily: 'var(--font-description)', fontSize: 11, color: T.textDim }}>No response headers captured.</span>;
  }
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 6,
        border: `1px solid ${T.border}`,
      }}
    >
      {Object.entries(headers).map(([k, v], i) => (
        <div key={k} style={i > 0 ? { borderTop: `1px solid ${T.border}` } : undefined}>
          <KVRow T={T} k={k} v={v} />
        </div>
      ))}
    </div>
  );
}
