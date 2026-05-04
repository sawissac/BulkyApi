'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useDispatch, useSelector } from 'react-redux';
import { Code2, Play, Loader2, ChevronRight, SkipForward, Footprints, BookOpen, WandSparkles, Square } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import { selectCode, setCode } from '@/store/editorSlice';
import { selectActiveItem, selectActiveCollection } from '@/store/collectionsSlice';
import { setSidebarTab } from '@/store/uiSlice';
import { selectEnvVars } from '@/store/collectionsSlice';
import { METHOD_CLR } from '@/lib/themes';
import { EXAMPLE_SCRIPTS } from '@/lib/sampleData';
import type { ExampleScript } from '@/lib/sampleData';
import ExampleDialog from './ExampleDialog';
import type { EditorInstance } from './MonacoCodeEditor';
import * as prettier from 'prettier/standalone';
import * as babelPlugin from 'prettier/plugins/babel';
import * as estreePlugin from 'prettier/plugins/estree';

const MonacoCodeEditor = dynamic(() => import('./MonacoCodeEditor'), { ssr: false });

type Props = {
  T: Theme;
  onRun: () => void;
  onNext: () => void;
  onStop: () => void;
  running: boolean;
  stepMode: boolean;
  paused: boolean;
  onToggleStep: () => void;
};

export default function CodeEditor({ T, onRun, onNext, onStop, running, stepMode, paused, onToggleStep }: Props) {
  const dispatch = useDispatch();
  const code = useSelector(selectCode);
  const activeItem = useSelector(selectActiveItem);
  const activeCollection = useSelector(selectActiveCollection);
  const envVars = useSelector(selectEnvVars);
  const monacoEditorRef = useRef<EditorInstance | null>(null);
  const exBtnRef = useRef<HTMLDivElement>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [dropPos, setDropPos] = useState<{ top: number; right: number } | null>(null);
  const [selectedExample, setSelectedExample] = useState<ExampleScript | null>(null);

  const toggleExamples = () => {
    if (showExamples) { setShowExamples(false); return; }
    if (exBtnRef.current) {
      const r = exBtnRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setShowExamples(true);
  };

  const handleFormat = async () => {
    try {
      const formatted = await prettier.format(code, {
        parser: 'babel',
        plugins: [babelPlugin, estreePlugin],
        singleQuote: true,
        printWidth: 80,
        trailingComma: 'all',
      });
      dispatch(setCode(formatted));
    } catch (e) {
      console.warn("Prettier format failed:", e);
      monacoEditorRef.current?.getAction('editor.action.formatDocument')?.run();
    }
  };

  const mc = activeItem ? (METHOD_CLR[activeItem.method] ?? T.textDim) : null;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', background: T.editorBg, minWidth: 0, height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 44, background: T.bgPanel, borderBottom: `1px solid ${T.border}`, flexShrink: 0, minWidth: 0 }}>
        <Code2 size={13} color={T.cyanDim} style={{ flexShrink: 0 }} />

        {/* Breadcrumb */}
        {activeItem && activeCollection ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <button
              onClick={() => dispatch(setSidebarTab('collections'))}
              title="Go to collection"
              style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80 }}
            >
              {activeCollection.name}
            </button>
            <ChevronRight size={10} color={T.textDim} style={{ flexShrink: 0 }} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: T.textBright, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
              {activeItem.name}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700, color: mc!, background: `${mc}18`, border: `1px solid ${mc}30`, padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>
              {activeItem.method}
            </span>
          </div>
        ) : (
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textDim, flex: 1 }}>
            Scratch Pad
          </span>
        )}

        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: T.textDim, flexShrink: 0 }}>⌘↵</span>

        {/* Format button */}
        <button
          onClick={handleFormat}
          title="Format document (Shift+Alt+F)"
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6,
            border: `1px solid ${T.border}`,
            background: 'transparent',
            color: T.textDim,
            cursor: 'pointer', transition: 'all 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = T.cyan; e.currentTarget.style.borderColor = T.borderAccent; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = T.textDim; e.currentTarget.style.borderColor = T.border; }}
        >
          <WandSparkles size={11} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.07em' }}>
            Format
          </span>
        </button>

        {/* Examples dropdown */}
        <div ref={exBtnRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={toggleExamples}
            title="Load an example script"
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6,
              border: `1px solid ${showExamples ? T.borderAccent : T.border}`,
              background: showExamples ? T.cyanFaint : 'transparent',
              color: showExamples ? T.cyan : T.textDim,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <BookOpen size={11} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.07em' }}>
              Examples
            </span>
          </button>
        </div>

        {/* Step mode toggle */}
        <button
          onClick={onToggleStep}
          disabled={running}
          title={stepMode ? 'Step mode on — click to disable' : 'Enable step-by-step mode'}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6,
            border: `1px solid ${stepMode ? T.borderAccent : T.border}`,
            background: stepMode ? T.cyanFaint : 'transparent',
            color: stepMode ? T.cyan : T.textDim,
            cursor: running ? 'not-allowed' : 'pointer',
            opacity: running ? 0.5 : 1,
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
        >
          <Footprints size={11} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.07em' }}>
            Step
          </span>
        </button>

        {/* Next button — only when paused in step mode */}
        {paused && (
          <button
            onClick={onNext}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 9999, border: 'none',
              background: `linear-gradient(135deg, ${T.warn}, #d97706)`,
              color: 'white',
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: `0 4px 16px ${T.warn}44`,
              animation: 'pulse 1s ease-in-out infinite',
              flexShrink: 0,
            }}
          >
            <SkipForward size={11} fill="white" />
            Next
          </button>
        )}

        {/* Stop button — only while running */}
        {running && !paused && (
          <button
            onClick={onStop}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 9999, border: 'none',
              background: `linear-gradient(135deg, ${T.error ?? '#dc2626'}, #b91c1c)`,
              color: 'white',
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(220,38,38,0.3)',
              flexShrink: 0,
            }}
          >
            <Square size={10} fill="white" />
            Stop
          </button>
        )}

        {/* Run button — hidden when running or paused */}
        {!running && !paused && (
          <button
            onClick={onRun}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 9999, border: 'none',
              background: 'linear-gradient(135deg,#0891b2,#2563eb)',
              color: 'white',
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(34,211,238,0.25)',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
          >
            <Play size={11} fill="white" />Run
          </button>
        )}

      </div>

      {/* Editor body */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <MonacoCodeEditor
          value={code}
          onChange={(v) => dispatch(setCode(v))}
          envVars={envVars}
          T={T}
          onRun={onRun}
          onMount={(editor) => { monacoEditorRef.current = editor; }}
        />
      </div>

      {/* Examples overlay + dropdown */}
      {showExamples && dropPos && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowExamples(false)} />
          <div style={{
            position: 'fixed', top: dropPos.top, right: dropPos.right, zIndex: 50,
            background: T.bgPanel, border: `1px solid ${T.border}`, borderRadius: 8,
            padding: 4, minWidth: 210,
            boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
          }}>
            {EXAMPLE_SCRIPTS.map((ex) => {
              const clr = ex.method === 'DOCS' ? '#a78bfa' : (METHOD_CLR[ex.method] ?? T.textDim);
              return (
                <button
                  key={ex.label}
                  onClick={() => { setSelectedExample(ex); setShowExamples(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '6px 10px', borderRadius: 5, border: 'none',
                    background: 'transparent', cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = T.bgHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 7, fontWeight: 700,
                    color: clr, background: `${clr}18`, border: `1px solid ${clr}30`,
                    padding: '1px 5px', borderRadius: 4, flexShrink: 0, minWidth: 34, textAlign: 'center',
                  }}>
                    {ex.method === 'DOCS' ? 'DOCS' : ex.method}
                  </span>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: 11, color: T.text }}>
                    {ex.label}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Example preview dialog */}
      {selectedExample && (
        <ExampleDialog
          T={T}
          example={selectedExample}
          onClose={() => setSelectedExample(null)}
          onLoad={() => { dispatch(setCode(selectedExample.code)); setSelectedExample(null); }}
        />
      )}

      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 12px', background: T.bgPanel, borderTop: `1px solid ${T.border}`, flexShrink: 0, minWidth: 0 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: T.textDim }}>JavaScript</span>
        {activeItem && (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: T.cyanDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeItem.name}
          </span>
        )}
        <span style={{ flex: 1 }} />
        {stepMode && (
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, fontWeight: 700, color: T.warn, letterSpacing: '0.1em' }}>
            STEP MODE
          </span>
        )}
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: T.cyanDim }}>Bulky Runtime v1.0</span>
      </div>
    </div>
  );
}
