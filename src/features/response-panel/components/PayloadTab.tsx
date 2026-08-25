'use client';

import type { Theme } from '@/lib/themes';
import type { ApiCall } from '@/lib/types';
import KVRow from '@/components/KVRow';

type Props = { T: Theme; call: ApiCall };

export default function PayloadTab({ T, call }: Props) {
  const label = (text: string) => (
    <div style={{ fontFamily: 'var(--font-title)', fontSize: 8, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.textDim, marginBottom: 5 }}>
      {text}
    </div>
  );

  /** Grouped, `divide`-style KV list — one bordered card instead of each row
   *  owning its own border/radius/margin. */
  const kvList = (entries: [string, string][], masked?: (k: string) => boolean) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 6,
        border: `1px solid ${T.border}`,
      }}
    >
      {entries.map(([k, v], i) => (
        <div key={k} style={i > 0 ? { borderTop: `1px solid ${T.border}` } : undefined}>
          <KVRow T={T} k={k} v={v} masked={masked?.(k)} />
        </div>
      ))}
    </div>
  );

  const headerEntries = Object.entries(call.requestHeaders || {});

  const queryEntries = (() => {
    try {
      return Array.from(new URL(call.url).searchParams.entries());
    } catch {
      return [];
    }
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {queryEntries.length > 0 && (
        <div>
          {label('Query Params')}
          {kvList(queryEntries)}
        </div>
      )}
      {headerEntries.length > 0 && (
        <div>
          {label('Request Headers')}
          {kvList(headerEntries, (k) => k.toLowerCase() === 'authorization')}
        </div>
      )}
      {!!call.requestBody && (
        <div>
          {label('Request Body')}
          <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: T.text, whiteSpace: 'pre-wrap', background: T.bgHover, border: `1px solid ${T.border}`, borderRadius: 6, padding: 10 }}>
            {JSON.stringify(call.requestBody, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
