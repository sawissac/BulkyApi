'use client';

import { useDispatch, useSelector } from 'react-redux';
import { Download, Upload, BarChart2, Copy, FileText, FolderUp } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import * as ui from '@/lib/ui';
import { selectCode, setCode } from '@/store/editorSlice';
import {
  selectCollections,
  selectActiveId,
  selectRecentItems,
  addItem,
  setActiveId,
  importCollections,
} from '@/store/collectionsSlice';
import { setSidebarTab } from '@/store/uiSlice';
import { downloadBlob, pickFile, readFileText } from '@/lib/fileUtils';
import { parseCurl, curlToScript } from '@/lib/curlParser';

type Props = { T: Theme };

/**
 * Each action gets its own accent so the list reads as a set of color blocks
 * rather than five identical rows. All four are theme tokens — the previous
 * hardcoded violet was unreadable on light themes.
 */
const TONES = {
  save: 'var(--app-success)',
  load: 'var(--app-accent)',
  json: 'var(--app-warn)',
  curl: 'var(--method-patch)',
} as const;

export default function FilePane({}: Props) {
  const dispatch = useDispatch();
  const code = useSelector(selectCode);
  const collections = useSelector(selectCollections);
  const activeId = useSelector(selectActiveId);
  const recents = useSelector(selectRecentItems);

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

  const onImportCollection = async () => {
    const file = await pickFile('.json,application/json');
    if (!file) return;
    try {
      const text = await readFileText(file);
      const json = JSON.parse(text);
      // Restore collections
      const imported = json.collections ? json.collections : (Array.isArray(json) ? json : [json]);

      // Handle legacy format with top-level environments
      if (json.environments?.length) {
        for (const col of imported) {
          if (!col.environments || col.environments.length === 0) {
            col.environments = JSON.parse(JSON.stringify(json.environments));
            col.envIdx = json.envIdx || 0;
          }
        }
      }

      dispatch(importCollections(imported));
      dispatch(setSidebarTab('collections'));
    } catch {
      alert('Failed to parse collection JSON.');
    }
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
    { icon: Download,  label: 'Save Script',       sub: 'Export current script as .js',  tone: TONES.save, onClick: onSaveScript },
    { icon: Upload,    label: 'Import Script',     sub: 'Load a .js automation file',    tone: TONES.load, onClick: onImportScript },
    { icon: FolderUp,  label: 'Import Collection', sub: 'Load collections from JSON',    tone: TONES.json, onClick: onImportCollection },
    { icon: BarChart2, label: 'Export Collection', sub: 'Save all collections as JSON',  tone: TONES.json, onClick: onExportCollection },
    { icon: Copy,      label: 'Import from cURL',  sub: 'Paste a curl command',          tone: TONES.curl, onClick: onImportCurl },
  ];

  return (
    <div className="flex flex-col gap-1.5 p-2.5">
      <h2 className={`${ui.label} mb-1`}>File Actions</h2>

      {ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            style={{ color: a.tone }}
            // The card carries the tone as its text color, so the icon block's
            // fill and border derive from it via `tint-current`.
            className="group flex items-center gap-2.5 rounded-md border border-app-border bg-app-hover p-2 text-left transition-colors duration-200 hover:border-current/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 focus-visible:ring-offset-app-sidebar"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md border tint-current transition-transform duration-200 group-hover:scale-110">
              <Icon size={15} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[12px] font-semibold text-app-bright">{a.label}</span>
              <span className="mt-0.5 block truncate text-[11px] text-app-dim">{a.sub}</span>
            </span>
          </button>
        );
      })}

      {/* Color block boundary rather than a hairline rule */}
      <h2 className={`${ui.label} mt-3`}>Recent</h2>

      {recents.length === 0 ? (
        <p className="px-2 py-1 text-[11px] text-app-dim">No recent tests yet</p>
      ) : (
        <ul className="flex flex-col">
          {recents.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  dispatch(setActiveId(item.id));
                  dispatch(setCode(item.code));
                  dispatch(setSidebarTab('collections'));
                }}
                className="flex w-full items-center gap-2 rounded-md border-0 bg-transparent px-2 py-1.5 text-left transition-colors duration-200 hover:bg-app-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-inset"
              >
                <FileText size={13} className="shrink-0 text-app-accent-dim" aria-hidden="true" />
                <span className="min-w-0 truncate font-mono text-[11px] text-app-dim">
                  {item.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
