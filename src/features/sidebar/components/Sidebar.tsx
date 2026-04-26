'use client';

import { useDispatch, useSelector } from 'react-redux';
import { FolderOpen, Globe, Braces, Files } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import { selectSidebarTab, setSidebarTab, type SidebarTab } from '@/store/uiSlice';
import CollPane from './CollPane';
import EnvPane from './EnvPane';
import VarsPane from './VarsPane';
import FilePane from './FilePane';

type Props = { T: Theme; narrow: boolean };

export default function Sidebar({ T, narrow }: Props) {
  const dispatch = useDispatch();
  const tab = useSelector(selectSidebarTab);

  const tabBtn = (id: SidebarTab, label: string, Icon: React.ElementType) => (
    <button
      key={id}
      onClick={() => dispatch(setSidebarTab(id))}
      style={{
        flex: 1,
        padding: '5px 0',
        background: tab === id ? T.bgSelected : 'transparent',
        border: 'none',
        color: tab === id ? T.cyan : T.textDim,
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        borderRadius: 5,
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: narrow ? 0 : 4,
      }}
    >
      <Icon size={11} />
      {!narrow && label}
    </button>
  );

  return (
    <div style={{ width: '100%', background: T.bgSidebar, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Logo */}
      <div style={{ padding: '13px 12px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#0F4C75,#3282B8)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 294.72 300" fill="#BBE1FA">
            <path d="M272.46 91.71v54.03h-41.34V94.68c0-5.81-1.41-10.46-4.24-13.91-2.85-3.47-6.66-5.21-11.46-5.21-4.34 0-8.11 1.59-11.26 4.76-3.17 3.17-4.76 6.94-4.76 11.28 0 4.58 1.43 8.32 4.3 11.28 2.87 2.95 6.52 4.42 10.94 4.42 3.61 0 6.98-.95 10.07-2.87v42.77c-3.39.59-6.48.89-9.3.89-16.57 0-30.38-5.47-41.44-16.37a55.08 55.08 0 01-6.01-6.96c-2.02 4.26-4.76 8.19-8.23 11.77-8.34 8.66-18.43 12.98-30.28 12.98s-23.21-5.15-32.94-15.48c-10.76 10.33-21.58 15.48-32.5 15.48-13.77 0-24.81-5.01-33.16-15.02-6.54-7.89-9.83-19.26-9.83-34.15V37.11h41.35v59.34c0 4.66.48 7.87 1.43 9.67.97 1.8 2.7 2.72 5.19 2.72 4.66 0 6.98-4.12 6.98-12.39V37.11h41.32v59.34c0 4.66.5 7.87 1.51 9.67.99 1.8 2.74 2.72 5.23 2.72 4.58 0 6.86-4.12 6.86-12.39V37.11h41.34v14.94c.61-.69 1.25-1.37 1.92-2.02 11.16-11.12 24.73-16.69 40.73-16.69 17.82 0 31.87 5.21 42.16 15.64 10.29 10.43 15.42 24.68 15.42 42.73zM147.2 262.92v-99.63l39.48 48-39.48 51.63zm86.35-52.52l40.08-53.28h-46.85l-14.47 24.87-17.94-24.87-47.17-.28h-45.8v51.08c0 5.81-1.57 10.44-4.72 13.91-3.13 3.47-7.35 5.19-12.66 5.19-4.82 0-8.98-1.59-12.49-4.74-3.51-3.17-5.27-6.94-5.27-11.28 0-4.58 1.59-8.32 4.78-11.28 3.19-2.95 7.23-4.42 12.13-4.42 4 0 7.71.95 11.14 2.87V155.4c-3.77-.59-7.17-.89-10.29-.89-18.37 0-33.67 5.45-45.92 16.35-12.25 10.92-18.37 24.58-18.37 41.01s6.18 29.55 18.55 40.67c12.37 11.14 25.81 14.09 43.52 14.09h109.98l16.03-26.56 18.97 26.56H275l-41.44-56.25z" />
          </svg>
        </div>
        {!narrow && (
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: T.textBright, letterSpacing: '0.05em' }}>BULKY API</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: T.cyanDim, letterSpacing: '0.1em' }}>v1.0.0</div>
          </div>
        )}
      </div>

      {/* Tab strip */}
      <div style={{ display: 'flex', gap: 3, padding: '7px 8px', borderBottom: `1px solid ${T.border}` }}>
        {tabBtn('collections', 'Tests', Files)}
        {tabBtn('env', 'Envs', Globe)}
        {tabBtn('vars', 'Vars', Braces)}
        {tabBtn('file', 'File', FolderOpen)}
      </div>

      {/* Pane */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'collections' && <CollPane T={T} />}
        {tab === 'env' && <EnvPane T={T} />}
        {tab === 'vars' && <VarsPane T={T} />}
        {tab === 'file' && <FilePane T={T} />}
      </div>
    </div>
  );
}
