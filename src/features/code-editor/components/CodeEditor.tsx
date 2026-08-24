'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useDispatch, useSelector } from 'react-redux';
import { Code2, Play, ChevronRight, SkipForward, Footprints, BookOpen, WandSparkles, Square } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import { selectCode, setCode } from '@/store/editorSlice';
import { selectActiveItem, selectActiveCollection } from '@/store/collectionsSlice';
import { setSidebarTab } from '@/store/uiSlice';
import { selectEnvVars } from '@/store/collectionsSlice';
import { EXAMPLE_SCRIPTS } from '@/lib/sampleData';
import type { ExampleScript } from '@/lib/sampleData';
import MethodPill from '@/components/MethodPill';
import ExampleDialog from './ExampleDialog';
import type { EditorInstance } from './MonacoCodeEditor';
import * as prettier from 'prettier/standalone';
import * as babelPlugin from 'prettier/plugins/babel';
import * as estreePlugin from 'prettier/plugins/estree';

const MonacoCodeEditor = dynamic(() => import('./MonacoCodeEditor'), { ssr: false });

/** Toolbar toggle: flat, bordered, fills with the accent tint when active. */
const TOOL_BTN =
  'flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-app-border bg-transparent px-2.5 text-app-dim transition-colors duration-200 ' +
  'hover:border-app-border-accent hover:bg-app-selected hover:text-app-accent ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel ' +
  'disabled:pointer-events-none disabled:opacity-50 ' +
  'data-active:border-app-border-accent data-active:bg-app-accent-faint data-active:text-app-accent';

/** Run / Stop / Next: the pane's solid action blocks. No gradient, no glow. */
const ACTION_BTN =
  'flex h-8 shrink-0 items-center gap-1.5 rounded-md border-0 px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-app-on-solid ' +
  'transition-transform duration-200 hover:scale-105 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel';

const TOOL_LABEL = 'text-[11px] font-semibold uppercase tracking-[0.07em]';

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

  // Escape closes the examples menu — it had no keyboard dismissal before
  useEffect(() => {
    if (!showExamples) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowExamples(false);
        exBtnRef.current?.querySelector('button')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showExamples]);

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

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-app-editor">
      {/* Toolbar */}
      <div className="flex h-11 min-w-0 shrink-0 items-center gap-2 border-b border-app-border bg-app-panel px-3">
        <Code2 size={14} className="shrink-0 text-app-accent-dim" aria-hidden="true" />

        {/* Breadcrumb */}
        {activeItem && activeCollection ? (
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            <button
              type="button"
              onClick={() => dispatch(setSidebarTab('collections'))}
              title="Go to collection"
              className="max-w-[100px] shrink-0 truncate rounded-sm border-0 bg-transparent p-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-app-dim transition-colors duration-200 hover:text-app-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
            >
              {activeCollection.name}
            </button>
            <ChevronRight size={12} className="shrink-0 text-app-dim" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-[12px] font-bold tracking-[0.02em] text-app-bright">
              {activeItem.name}
            </span>
            <MethodPill method={activeItem.method} sm />
          </div>
        ) : (
          <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-app-dim">
            Scratch Pad
          </span>
        )}

        <span className="shrink-0 font-mono text-[11px] text-app-dim" title="Run shortcut">⌘↵</span>

        <button
          type="button"
          onClick={handleFormat}
          title="Format document (Shift+Alt+F)"
          className={TOOL_BTN}
        >
          <WandSparkles size={13} aria-hidden="true" />
          <span className={TOOL_LABEL}>Format</span>
        </button>

        <div ref={exBtnRef} className="relative shrink-0">
          <button
            type="button"
            onClick={toggleExamples}
            title="Load an example script"
            aria-haspopup="menu"
            aria-expanded={showExamples}
            data-active={showExamples || undefined}
            className={TOOL_BTN}
          >
            <BookOpen size={13} aria-hidden="true" />
            <span className={TOOL_LABEL}>Examples</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleStep}
          disabled={running}
          title={stepMode ? 'Step mode on — click to disable' : 'Enable step-by-step mode'}
          aria-pressed={stepMode}
          data-active={stepMode || undefined}
          className={TOOL_BTN}
        >
          <Footprints size={13} aria-hidden="true" />
          <span className={TOOL_LABEL}>Step</span>
        </button>

        {/* Next — only when paused in step mode */}
        {paused && (
          <button
            type="button"
            onClick={onNext}
            className={`${ACTION_BTN} animate-[pulse_1s_ease-in-out_infinite] bg-app-warn focus-visible:ring-app-warn`}
          >
            <SkipForward size={13} fill="currentColor" aria-hidden="true" />
            Next
          </button>
        )}

        {/* Stop — only while running */}
        {running && !paused && (
          <button
            type="button"
            onClick={onStop}
            className={`${ACTION_BTN} bg-app-error focus-visible:ring-app-error`}
          >
            <Square size={12} fill="currentColor" aria-hidden="true" />
            Stop
          </button>
        )}

        {/* Run — hidden while running or paused */}
        {!running && !paused && (
          <button
            type="button"
            onClick={onRun}
            className={`${ACTION_BTN} bg-app-accent focus-visible:ring-app-accent`}
          >
            <Play size={13} fill="currentColor" aria-hidden="true" />
            Run
          </button>
        )}
      </div>

      {/* Editor body */}
      <div className="relative flex-1 overflow-hidden">
        <MonacoCodeEditor
          value={code}
          onChange={(v) => dispatch(setCode(v))}
          envVars={envVars}
          T={T}
          onRun={onRun}
          onMount={(editor) => { monacoEditorRef.current = editor; }}
        />
      </div>

      {/* Examples overlay + menu */}
      {showExamples && dropPos && (
        <>
          <div className="fixed inset-0 z-49" onClick={() => setShowExamples(false)} />
          <div
            role="menu"
            aria-label="Example scripts"
            style={{ top: dropPos.top, right: dropPos.right }}
            className="fixed z-50 min-w-[230px] rounded-lg border-2 border-app-border-mid bg-app-panel p-1"
          >
            {EXAMPLE_SCRIPTS.map((ex) => (
              <button
                key={ex.label}
                type="button"
                role="menuitem"
                onClick={() => { setSelectedExample(ex); setShowExamples(false); }}
                className="flex w-full items-center gap-2.5 rounded-md border-0 bg-transparent px-2.5 py-2 text-left transition-colors duration-200 hover:bg-app-hover focus-visible:bg-app-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-accent"
              >
                <span className="flex w-11 shrink-0 justify-center">
                  <MethodPill method={ex.method} sm focusable={false} />
                </span>
                <span className="text-[12px] text-app-text">{ex.label}</span>
              </button>
            ))}
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
      <div className="flex min-w-0 shrink-0 items-center gap-3 border-t border-app-border bg-app-panel px-3 py-1.5">
        <span className="font-mono text-[11px] text-app-dim">JavaScript</span>
        {activeItem && (
          <span className="truncate font-mono text-[11px] text-app-accent-dim">
            {activeItem.name}
          </span>
        )}
        <span className="flex-1" />
        {stepMode && (
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-app-warn">
            Step mode
          </span>
        )}
        <span className="shrink-0 font-mono text-[11px] text-app-accent-dim">Bulky Runtime v1.0</span>
      </div>
    </div>
  );
}
