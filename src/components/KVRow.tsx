'use client';

import type { Theme } from '@/lib/themes';

type Props = {
  T: Theme;
  k: string;
  v: string;
  masked?: boolean;
};

export default function KVRow({ T, k, v, masked }: Props) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.5fr',
        gap: 8,
        padding: '4px 8px',
        borderRadius: 5,
        border: `1px solid ${T.border}`,
        background: T.bgHover,
        marginBottom: 3,
      }}
    >
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: T.cyan }}>{k}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: T.text, wordBreak: 'break-all' }}>
        {masked ? v.slice(0, 24) + '…' : v}
      </span>
    </div>
  );
}
