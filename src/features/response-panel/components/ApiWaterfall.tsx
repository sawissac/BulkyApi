'use client';

import { useSelector } from 'react-redux';
import { Code2 } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import { statusColor, METHOD_CLR } from '@/lib/themes';
import { selectBuiltCalls, selectRunStartedAt } from '@/store/runnerSlice';

type Props = { T: Theme };

export default function ApiWaterfall({ T }: Props) {
  const calls = useSelector(selectBuiltCalls);
  const runStartedAt = useSelector(selectRunStartedAt);

  if (calls.length === 0) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: 0.3 }}>
        <Code2 size={32} color={T.textDim} strokeWidth={1} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: T.textDim }}>No api.* calls found in script</span>
      </div>
    );
  }

  const runStart = runStartedAt ?? 0;

  // Compute timeline extents
  const rows = calls.map((c) => {
    const startMs = c.timestamp ? Math.max(0, new Date(c.timestamp).getTime() - runStart) : 0;
    const endMs = startMs + (c.duration || 0);
    return { call: c, startMs, endMs };
  });

  const totalMs = Math.max(...rows.map((r) => r.endMs), 1);

  return (
    <div style={{ padding: '10px 0' }}>
      {/* Time axis header */}
      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 52px', gap: 6, padding: '0 10px 6px', borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 7, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.textDim }}>Method / URL</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 7, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.textDim }}>Timeline</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 7, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.textDim, textAlign: 'right' }}>ms</span>
      </div>

      {rows.map(({ call, startMs, endMs }) => {
        const barLeft = (startMs / totalMs) * 100;
        const barWidth = Math.max(((endMs - startMs) / totalMs) * 100, call.status === 'pending' ? 100 - barLeft : 1);
        const mc = METHOD_CLR[call.method] ?? T.textDim;
        const sc = call.status === 'idle' ? T.border : call.status === 'pending' ? T.cyan : statusColor(call.statusCode, T);
        const isPending = call.status === 'pending';

        const urlDisplay = call.url.length > 38 ? '…' + call.url.slice(-36) : call.url;

        return (
          <div
            key={call.idx}
            style={{ display: 'grid', gridTemplateColumns: '90px 1fr 52px', gap: 6, padding: '5px 10px', borderBottom: `1px solid ${T.border}`, alignItems: 'center' }}
          >
            {/* Method + URL */}
            <div style={{ minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700, color: mc, marginRight: 4 }}>{call.method}</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: T.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>{urlDisplay}</div>
            </div>

            {/* Waterfall bar */}
            <div style={{ position: 'relative', height: 14, background: T.bgHover, borderRadius: 3, overflow: 'hidden' }}>
              <div
                style={{
                  position: 'absolute',
                  left: `${barLeft}%`,
                  width: `${barWidth}%`,
                  height: '100%',
                  background: sc,
                  borderRadius: 3,
                  opacity: call.status === 'idle' ? 0.2 : 0.75,
                  animation: isPending ? 'pulse 0.8s ease-in-out infinite' : undefined,
                  transition: 'width 0.2s, background 0.3s',
                }}
              />
              {call.statusCode && (
                <span style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-mono)', fontSize: 7, color: sc, fontWeight: 700 }}>
                  {call.statusCode}
                </span>
              )}
            </div>

            {/* Duration */}
            <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 8, color: call.duration ? T.textDim : 'transparent' }}>
              {call.duration ? call.duration : '—'}
            </div>
          </div>
        );
      })}

      {/* Total row */}
      {calls.some((c) => c.duration > 0) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 10px 0', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: T.textDim }}>total</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: T.cyan, fontWeight: 700 }}>
            {totalMs}ms
          </span>
        </div>
      )}
    </div>
  );
}
