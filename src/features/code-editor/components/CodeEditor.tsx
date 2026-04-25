'use client';

import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Code2, Play, Loader2 } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import { selectCode, setCode } from '@/store/editorSlice';

type Props = {
  T: Theme;
  onRun: () => void;
  running: boolean;
};

export default function CodeEditor({ T, onRun, running }: Props) {
  const dispatch = useDispatch();
  const code = useSelector(selectCode);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const gutRef = useRef<HTMLDivElement>(null);
  const lines = code.split('\n').length;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: en } = e.currentTarget;
      const next = code.slice(0, s) + '  ' + code.slice(en);
      dispatch(setCode(next));
      setTimeout(() => {
        if (taRef.current) {
          taRef.current.selectionStart = taRef.current.selectionEnd = s + 2;
        }
      }, 0);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun();
    }
  };

  const syncScroll = () => {
    if (gutRef.current && taRef.current) {
      gutRef.current.scrollTop = taRef.current.scrollTop;
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', background: T.editorBg, minWidth: 0, height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 44, background: T.bgPanel, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <Code2 size={13} color={T.cyanDim} />
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textDim, flex: 1 }}>
          Automation Script
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: T.textDim }}>⌘↵ run</span>
        <button
          onClick={onRun}
          disabled={running}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 9999, border: 'none',
            background: running ? T.cyanFaint : 'linear-gradient(135deg,#0891b2,#2563eb)',
            color: running ? T.cyanDim : 'white',
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            cursor: running ? 'not-allowed' : 'pointer',
            boxShadow: running ? 'none' : '0 4px 16px rgba(34,211,238,0.25)',
            transition: 'all 0.2s',
          }}
        >
          {running
            ? <><Loader2 size={11} style={{ animation: 'spin 0.7s linear infinite' }} />Running…</>
            : <><Play size={11} fill="white" />Run Script</>
          }
        </button>
      </div>

      {/* Editor body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Gutter */}
        <div
          ref={gutRef}
          style={{ width: 44, background: T.gutterBg, borderRight: `1px solid ${T.border}`, paddingTop: 12, overflowY: 'hidden', userSelect: 'none', flexShrink: 0 }}
        >
          {Array.from({ length: lines }, (_, i) => (
            <div key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: '20px', color: T.lineNum, textAlign: 'right', paddingRight: 8 }}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={taRef}
          value={code}
          onChange={(e) => dispatch(setCode(e.target.value))}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          spellCheck={false}
          style={{
            flex: 1, padding: '12px 12px', background: 'transparent', border: 'none', resize: 'none', outline: 'none',
            color: '#c9d8e8', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: '20px',
            whiteSpace: 'pre', overflowWrap: 'normal', overflowX: 'auto', overflowY: 'auto',
          }}
        />
      </div>

      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 12px', background: T.bgPanel, borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: T.textDim }}>{lines} ln</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: T.textDim }}>JavaScript</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: T.cyanDim }}>Bulky Runtime v1.0</span>
      </div>
    </div>
  );
}
