'use client';

import type { Theme } from '@/lib/themes';
import KVRow from '@/components/KVRow';

type Props = { T: Theme; headers: Record<string, string> };

export default function HeadTab({ T, headers }: Props) {
  if (Object.keys(headers).length === 0) {
    return <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: T.textDim }}>No response headers captured.</span>;
  }
  return (
    <div>
      {Object.entries(headers).map(([k, v]) => (
        <KVRow key={k} T={T} k={k} v={v} />
      ))}
    </div>
  );
}
