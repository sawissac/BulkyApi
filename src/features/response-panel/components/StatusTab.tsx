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

  const statLabel = (val: string, lbl: string, color: string) => (
    <div style={{ padding: 10, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgHover }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 7, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.textDim, marginBottom: 4 }}>
        {lbl}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {val}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, borderRadius: 10, border: `1px solid ${c}25`, background: `${c}0a` }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 40, fontWeight: 700, color: c, lineHeight: 1 }}>
          {call.statusCode || '—'}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: c }}>
            {call.statusCode ? (STATUS_TXT[call.statusCode] || call.status) : call.status}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: T.textDim, marginTop: 3 }}>
            {call.method} {path}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {statLabel(`${dur}ms`, 'Duration', durColor)}
        {statLabel(call.timestamp ? new Date(call.timestamp).toLocaleTimeString() : '—', 'Timestamp', T.textDim)}
        {statLabel(call.method, 'Method', METHOD_CLR[call.method] || T.textDim)}
        {statLabel(host, 'Host', T.textDim)}
      </div>
    </div>
  );
}
