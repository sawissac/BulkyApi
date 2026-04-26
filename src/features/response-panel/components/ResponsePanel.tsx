'use client';

import { useSelector, useDispatch } from 'react-redux';
import { Terminal, Code2, BarChart2 } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import { selectBuiltCalls, selectLogs } from '@/store/runnerSlice';
import { selectResponseView, setResponseView } from '@/store/uiSlice';
import { statusColor } from '@/lib/themes';
import CallCard from './CallCard';
import ApiWaterfall from './ApiWaterfall';

type Props = { T: Theme };

export default function ResponsePanel({ T }: Props) {
  const dispatch = useDispatch();
  const builtCalls = useSelector(selectBuiltCalls);
  const logs = useSelector(selectLogs);
  const view = useSelector(selectResponseView);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', background: T.bgPanel, minWidth: 0, height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: 44, background: T.bg, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <Terminal size={13} color={T.cyanDim} />
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textDim, flex: 1 }}>
          Call Script
        </span>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 2, background: T.bgHover, borderRadius: 6, padding: 2, border: `1px solid ${T.border}` }}>
          {(['cards', 'waterfall'] as const).map((v) => (
            <button
              key={v}
              onClick={() => dispatch(setResponseView(v))}
              title={v === 'cards' ? 'Card view' : 'Waterfall view'}
              style={{
                background: view === v ? T.bgSelected : 'transparent',
                border: `1px solid ${view === v ? T.borderAccent : 'transparent'}`,
                borderRadius: 4,
                padding: '2px 5px',
                color: view === v ? T.cyan : T.textDim,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.15s',
              }}
            >
              {v === 'cards' ? <Code2 size={11} /> : <BarChart2 size={11} />}
            </button>
          ))}
        </div>

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

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {view === 'waterfall' ? (
          <ApiWaterfall T={T} />
        ) : builtCalls.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: 0.3 }}>
            <Code2 size={32} color={T.textDim} strokeWidth={1} />
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: 11, color: T.textDim }}>No api.* calls found in script</span>
          </div>
        ) : (
          builtCalls.map((call, i) => (
            <CallCard key={i} T={T} call={call} />
          ))
        )}
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
