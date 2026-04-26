'use client';

import { useDispatch, useSelector } from 'react-redux';
import { Download, Upload, BarChart2, Copy, FileText } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import { selectCode, setCode } from '@/store/editorSlice';
import {
  selectCollections,
  selectActiveId,
  selectRecentItems,
  addItem,
  setActiveId,
} from '@/store/collectionsSlice';
import { setSidebarTab } from '@/store/uiSlice';
import { downloadBlob, pickFile, readFileText } from '@/lib/fileUtils';
import { parseCurl, curlToScript } from '@/lib/curlParser';

type Props = { T: Theme };

const COLOR_KEYS = ['success', 'cyan', 'warn', 'purple'] as const;

export default function FilePane({ T }: Props) {
  const dispatch = useDispatch();
  const code = useSelector(selectCode);
  const collections = useSelector(selectCollections);
  const activeId = useSelector(selectActiveId);
  const recents = useSelector(selectRecentItems);

  const colorMap: Record<string, string> = {
    success: T.success,
    cyan: T.cyan,
    warn: T.warn,
    purple: '#a78bfa',
  };

  const targetCollectionId = (() => {
    if (activeId) {
      const owner = collections.find((c) => c.items.some((i) => i.id === activeId));
      if (owner) return owner.id;
    }
    return collections[0]?.id ?? null;
  })();

  const onSaveScript = () => {
    const activeName = activeId
      ? collections.flatMap((c) => c.items).find((i) => i.id === activeId)?.name
      : 'script';
    const safe = (activeName || 'script').replace(/[^\w\-]+/g, '_').toLowerCase();
    downloadBlob(`${safe}.js`, code, 'text/javascript');
  };

  const onImportScript = async () => {
    const file = await pickFile('.js,.txt,text/javascript,text/plain');
    if (!file) return;
    const text = await readFileText(file);
    dispatch(setCode(text));
    if (targetCollectionId) {
      dispatch(addItem({
        collectionId: targetCollectionId,
        name: file.name.replace(/\.[^.]+$/, ''),
        method: 'GET',
        code: text,
      }));
      dispatch(setSidebarTab('collections'));
    }
  };

  const onExportCollection = () => {
    const json = JSON.stringify({ collections }, null, 2);
    downloadBlob(`bulky-collections-${Date.now()}.json`, json, 'application/json');
  };

  const onImportCurl = () => {
    const input = window.prompt('Paste your curl command:');
    if (!input) return;
    const parsed = parseCurl(input);
    if (!parsed) { alert('Could not parse curl command.'); return; }
    const script = curlToScript(parsed);
    if (targetCollectionId) {
      const u = new URL(parsed.url);
      const name = `${parsed.method} ${u.pathname || u.host}`.slice(0, 40);
      dispatch(addItem({
        collectionId: targetCollectionId,
        name,
        method: parsed.method,
        code: script,
      }));
      dispatch(setSidebarTab('collections'));
    } else {
      dispatch(setCode(script));
    }
  };

  const ACTIONS = [
    { icon: Download, label: 'Save Script', sub: 'Export current script as .js', colorKey: COLOR_KEYS[0], onClick: onSaveScript },
    { icon: Upload,   label: 'Import Script', sub: 'Load a .js automation file', colorKey: COLOR_KEYS[1], onClick: onImportScript },
    { icon: BarChart2, label: 'Export Collection', sub: 'Save all collections as JSON', colorKey: COLOR_KEYS[2], onClick: onExportCollection },
    { icon: Copy,     label: 'Import from cURL', sub: 'Paste a curl command', colorKey: COLOR_KEYS[3], onClick: onImportCurl },
  ];

  return (
    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.textDim, display: 'block', marginBottom: 4 }}>
        File Actions
      </span>

      {ACTIONS.map((a, i) => {
        const color = colorMap[a.colorKey];
        const Icon = a.icon;
        return (
          <div
            key={i}
            onClick={a.onClick}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgHover, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${color}50`; e.currentTarget.style.background = `${color}0a`; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.bgHover; }}
          >
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={13} color={color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 600, color: T.textBright }}>{a.label}</div>
              <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 9, color: T.textDim, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.sub}</div>
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 4, height: 1, background: T.border }} />
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.textDim }}>
        Recent
      </span>

      {recents.length === 0 ? (
        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: 9, color: T.textDim, opacity: 0.6, padding: '4px 8px' }}>
          No recent tests yet
        </span>
      ) : (
        recents.map((item) => (
          <div
            key={item.id}
            onClick={() => { dispatch(setActiveId(item.id)); dispatch(setCode(item.code)); dispatch(setSidebarTab('collections')); }}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', transition: 'background 0.12s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = T.bgHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <FileText size={11} color={T.cyanDim} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: T.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.name}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
