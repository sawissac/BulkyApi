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
