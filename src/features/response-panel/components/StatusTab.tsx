'use client';

import type { Theme } from '@/lib/themes';
import type { ApiCall } from '@/lib/types';
import { statusColor, STATUS_TXT, METHOD_CLR } from '@/lib/themes';

type Props = { T: Theme; call: ApiCall };

export default function StatusTab({ T, call }: Props) {
  const c = statusColor(call.statusCode, T);
  const dur = call.duration;
  const durColor = dur < 500 ? T.success : dur < 2000 ? T.warn : T.error;
  const path = (() => {
    try { return new URL(call.url).pathname || '/'; } catch { return call.url.replace(/^https?:\/\/[^/]+/, '') || call.url; }
  })();
  const host = (() => {
    try { return new URL(call.url).hostname; } catch { return call.url.split('/')[2] || call.url; }
  })();

  const statCell = (val: string, lbl: string, color: string, i: number) => (
    <div
      style={{
        padding: 8,
        borderLeft: i % 2 === 1 ? `1px solid ${T.border}` : undefined,
        borderTop: i >= 2 ? `1px solid ${T.border}` : undefined,
      }}
    >
      <div style={{ fontFamily: 'var(--font-title)', fontSize: 7, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.textDim, marginBottom: 4 }}>
        {lbl}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {val}
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 6,
        border: `1px solid ${T.border}`,
        background: T.bgHover,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: 8,
          overflow: 'hidden',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: c, flexShrink: 0 }}>
          {call.statusCode || '—'}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: c, flexShrink: 0 }}>
          {call.statusCode ? (STATUS_TXT[call.statusCode] || call.status) : call.status}
        </span>
        <span style={{ color: T.border, flexShrink: 0 }}>·</span>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 10,
            color: T.textDim,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {call.method} {path}
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderTop: `1px solid ${T.border}`,
        }}
      >
        {statCell(`${dur}ms`, 'Duration', durColor, 0)}
        {statCell(call.timestamp ? new Date(call.timestamp).toLocaleTimeString() : '—', 'Timestamp', T.textDim, 1)}
        {statCell(call.method, 'Method', METHOD_CLR[call.method] || T.textDim, 2)}
        {statCell(host, 'Host', T.textDim, 3)}
      </div>
    </div>
  );
}
