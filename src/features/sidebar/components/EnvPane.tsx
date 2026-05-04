'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Copy, Plus, Trash2 } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import {
  selectActiveId,
  selectActiveCollection,
  selectEnvironments,
  selectEnvIdx,
  setEnvIdx,
  addEnvironment,
  removeEnvironment,
  renameEnvironment,
  duplicateEnvironment,
} from '@/store/collectionsSlice';

type Props = { T: Theme };

export default function EnvPane({ T }: Props) {
  const dispatch = useDispatch();
  const activeCol = useSelector(selectActiveCollection);
  const environments = useSelector(selectEnvironments);
  const envIdx = useSelector(selectEnvIdx);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  if (!activeCol) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: T.textDim, fontFamily: "'Space Grotesk', sans-serif", fontSize: 10 }}>
        Select a collection to manage environments.
      </div>
    );
  }

  const commitAdd = () => {
    const name = newName.trim();
    if (name) dispatch(addEnvironment({ collectionId: activeCol.id, name }));
    setNewName('');
    setAdding(false);
  };

  const commitRename = () => {
    if (editingId && editDraft.trim()) {
      dispatch(renameEnvironment({ id: editingId, name: editDraft.trim() }));
    }
    setEditingId(null);
  };

  return (
    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.textDim }}>
          {activeCol.name} Env
        </span>
        <button
          onClick={() => setAdding(true)}
          style={{ background: 'transparent', border: 'none', color: T.cyanDim, cursor: 'pointer', lineHeight: 1, padding: '0 2px', display: 'flex' }}
          title="Add Environment"
        >
          <Plus size={13} />
        </button>
      </div>

      {environments.map((env, i) => {
        const isEditing = editingId === env.id;
        return (
          <div
            key={env.id}
            onClick={() => !isEditing && dispatch(setEnvIdx({ collectionId: activeCol.id, envIdx: i }))}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: `1px solid ${i === envIdx ? T.borderAccent : T.border}`,
              background: i === envIdx ? T.bgSelected : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              const btn = e.currentTarget.querySelector<HTMLButtonElement>('.env-del');
              if (btn) btn.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget.querySelector<HTMLButtonElement>('.env-del');
              if (btn) btn.style.opacity = '0.6';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: i === envIdx ? T.cyan : T.textDim, flexShrink: 0, transition: 'background 0.15s' }} />
              {isEditing ? (
                <input
                  autoFocus
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null); }}
                  onBlur={commitRename}
                  style={{ flex: 1, minWidth: 0, background: T.bg, border: `1px solid ${T.borderAccent}`, borderRadius: 4, padding: '2px 5px', fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 600, color: T.textBright, outline: 'none' }}
                />
              ) : (
                <span
                  onDoubleClick={(e) => { e.stopPropagation(); setEditingId(env.id); setEditDraft(env.name); }}
                  style={{ flex: 1, minWidth: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 600, color: i === envIdx ? T.textBright : T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  title="Double-click to rename"
                >
                  {env.name}
                </span>
              )}
              <button
                className="env-dup"
                onClick={(e) => { e.stopPropagation(); dispatch(duplicateEnvironment(env.id)); }}
                style={{ background: 'transparent', border: 'none', color: T.cyanDim, cursor: 'pointer', lineHeight: 1, padding: 0, opacity: 0.6, transition: 'opacity 0.15s', display: 'flex', flexShrink: 0 }}
                title="Duplicate"
              >
                <Copy size={11} />
              </button>
              <button
                className="env-del"
                onClick={(e) => { e.stopPropagation(); if (confirm(`Delete environment "${env.name}"?`)) dispatch(removeEnvironment(env.id)); }}
                style={{ background: 'transparent', border: 'none', color: T.error, cursor: 'pointer', lineHeight: 1, padding: 0, opacity: 0.6, transition: 'opacity 0.15s', display: 'flex', flexShrink: 0 }}
                title="Delete"
              >
                <Trash2 size={11} />
              </button>
            </div>
            <div style={{ marginTop: 3, fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: T.textDim, paddingLeft: 13 }}>
              {Object.keys(env.vars).length} variables
            </div>
          </div>
        );
      })}

      {adding && (
        <input
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitAdd();
            if (e.key === 'Escape') { setAdding(false); setNewName(''); }
          }}
          onBlur={commitAdd}
          placeholder="Environment name…"
          style={{
            background: T.bgHover,
            border: `1px solid ${T.borderAccent}`,
            borderRadius: 6,
            padding: '6px 8px',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11,
            color: T.textBright,
            outline: 'none',
          }}
        />
      )}
    </div>
  );
}
