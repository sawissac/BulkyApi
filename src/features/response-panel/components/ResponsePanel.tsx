'use client';

import { useSelector } from 'react-redux';
import { Terminal, Code2 } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import { selectBuiltCalls, selectLogs } from '@/store/runnerSlice';
import { statusColor } from '@/lib/themes';
import CallCard from './CallCard';

type Props = { T: Theme };

export default function ResponsePanel({ T }: Props) {
  const builtCalls = useSelector(selectBuiltCalls);
  const logs = useSelector(selectLogs);
  const lastActiveIdx = [...builtCalls].reverse().findIndex((c) => c.status !== 'idle');
  const lastActive = lastActiveIdx >= 0 ? builtCalls.length - 1 - lastActiveIdx : -1;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', background: T.bgPanel, minWidth: 0, height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: 44, background: T.bg, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <Terminal size={13} color={T.cyanDim} />
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textDim, flex: 1 }}>
          Call Script
        </span>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {builtCalls.map((c, i) => {
            const bg = c.status === 'idle' ? T.border : c.status === 'pending' ? T.cyan : statusColor(c.statusCode, T);
            return (
              <div
                key={i}
                style={{ width: 6, height: 6, borderRadius: '50%', background: bg, transition: 'background 0.3s', opacity: c.status === 'idle' ? 0.35 : 1, animation: c.status === 'pending' ? 'pulse 0.8s ease-in-out infinite' : undefined }}
              />
            );
          })}
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: T.cyanDim, marginLeft: 6 }}>
          {builtCalls.length}
        </span>
      </div>

      {/* Card list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {builtCalls.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: 0.3 }}>
            <Code2 size={32} color={T.textDim} strokeWidth={1} />
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: 11, color: T.textDim }}>No api.* calls found in script</span>
          </div>
        ) : builtCalls.map((call, i) => (
          <CallCard key={`${i}-${call.status}`} T={T} call={call} defaultOpen={i === lastActive} />
        ))}
      </div>

      {/* Console */}
      {logs.length > 0 && (
        <div style={{ borderTop: `1px solid ${T.border}`, maxHeight: 90, overflowY: 'auto', background: T.editorBg, flexShrink: 0 }}>
          <div style={{ padding: '3px 10px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.textDim }}>Console</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: T.textDim }}>{logs.length}</span>
          </div>
          {logs.map((l, i) => (
            <div
              key={i}
              style={{ padding: '3px 10px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, borderBottom: `1px solid ${T.border}`, color: l.level === 'error' ? T.error : l.level === 'warn' ? T.warn : T.textDim }}
            >
              <span style={{ color: T.textDim, marginRight: 6 }}>[{l.level}]</span>{l.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
