'use client';

import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Terminal, Code2, BarChart2, ChevronUp, ChevronDown, ArrowUpFromLine } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import { selectBuiltCalls, selectLogs, selectExtractedVars } from '@/store/runnerSlice';
import { selectResponseView, setResponseView, setResponseViewForItem } from '@/store/uiSlice';
import { selectActiveId } from '@/store/collectionsSlice';
import { selectActiveEnv, setVar } from '@/store/environmentSlice';
import { statusColor } from '@/lib/themes';
import CallCard from './CallCard';
import ApiWaterfall from './ApiWaterfall';
import ApiDocs from './ApiDocs';
import { FileText } from 'lucide-react';

type Props = { T: Theme };

export default function ResponsePanel({ T }: Props) {
  const dispatch = useDispatch();
  const builtCalls = useSelector(selectBuiltCalls);
  const logs = useSelector(selectLogs);
  const view = useSelector(selectResponseView);
  const activeId = useSelector(selectActiveId);

  const extractedVars = useSelector(selectExtractedVars);
  const activeEnv = useSelector(selectActiveEnv);

  const [consoleExpanded, setConsoleExpanded] = useState(false);

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
          {(['cards', 'waterfall', 'docs'] as const).map((v) => (
            <button
              key={v}
              onClick={() => {
                dispatch(setResponseView(v));
                if (activeId) dispatch(setResponseViewForItem({ itemId: activeId, view: v }));
              }}
              title={v === 'cards' ? 'Card view' : v === 'waterfall' ? 'Waterfall view' : 'Documentation view'}
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
              {v === 'cards' ? <Code2 size={11} /> : v === 'waterfall' ? <BarChart2 size={11} /> : <FileText size={11} />}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {(() => {
            const count = builtCalls.length;
            const overflow = count > 4;
            const heat = count > 10;
            const heatLevel = heat ? Math.min(1, (count - 10) / 20) : 0;
            const dots = builtCalls.slice(0, 4);
            return dots.map((c, i) => {
              let bg = c.status === 'idle' ? T.border : c.status === 'pending' ? T.cyan : statusColor(c.statusCode, T);
              if (heat) {
                const t = Math.min(1, heatLevel + (i / 3) * (1 - heatLevel) * 0.6);
                const r = Math.round(220 * t + 0 * (1 - t));
                const g = Math.round(50  * t + 200 * (1 - t));
                const b = Math.round(50  * t + 160 * (1 - t));
                bg = `rgb(${r},${g},${b})`;
              } else if (overflow) {
                const gradients = [T.cyan, T.warn, T.error, T.error];
                bg = gradients[i] ?? T.error;
              }
              return (
                <div
                  key={i}
                  style={{ width: 6, height: 6, borderRadius: '50%', background: bg, transition: 'background 0.6s', opacity: c.status === 'idle' ? 0.35 : 1, animation: c.status === 'pending' ? 'pulse 0.8s ease-in-out infinite' : undefined }}
                />
              );
            });
          })()}
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: T.cyanDim, marginLeft: 6 }}>
          {builtCalls.length}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {view === 'waterfall' ? (
          <ApiWaterfall T={T} />
        ) : view === 'docs' ? (
          <ApiDocs T={T} calls={builtCalls} />
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

      {/* Extracted vars */}
      {Object.keys(extractedVars).length > 0 && (
        <div style={{ borderTop: `1px solid ${T.border}`, background: T.bgPanel, flexShrink: 0 }}>
          <div style={{ padding: '4px 10px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowUpFromLine size={10} color={T.cyanDim} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.textDim, flex: 1 }}>
              Extracted
            </span>
            {activeEnv && (
              <button
                onClick={() => {
                  for (const [k, v] of Object.entries(extractedVars)) {
                    dispatch(setVar({ envId: activeEnv.id, key: k, value: v }));
                  }
                }}
                title={`Promote all to ${activeEnv.name}`}
                style={{ background: T.bgHover, border: `1px solid ${T.borderAccent}`, borderRadius: 4, padding: '2px 7px', color: T.cyan, fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.07em' }}
              >
                promote all → {activeEnv.name}
              </button>
            )}
          </div>
          <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.entries(extractedVars).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: T.cyan, flexShrink: 0 }}>{k}</span>
                <span style={{ color: T.textDim, fontSize: 9 }}>=</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: T.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                {activeEnv && (
                  <button
                    onClick={() => dispatch(setVar({ envId: activeEnv.id, key: k, value: v }))}
                    title={`Promote ${k} to ${activeEnv.name}`}
                    style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 4, padding: '1px 6px', color: T.textDim, fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, cursor: 'pointer', flexShrink: 0 }}
                  >
                    → env
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Console */}
      {logs.length > 0 && (
        <div style={{ borderTop: `1px solid ${T.border}`, maxHeight: consoleExpanded ? 240 : 90, overflowY: 'auto', background: T.editorBg, flexShrink: 0, transition: 'max-height 0.2s ease' }}>
          <div style={{ padding: '3px 10px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 6, position: 'sticky', top: 0, background: T.editorBg, zIndex: 1 }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.textDim }}>Console</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: T.textDim }}>{logs.length}</span>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setConsoleExpanded((e) => !e)}
              title={consoleExpanded ? 'Collapse console' : 'Expand console'}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.textDim, display: 'flex', alignItems: 'center', padding: 2 }}
            >
              {consoleExpanded ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
            </button>
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
