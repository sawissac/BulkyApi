'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Copy, Plus, Trash2 } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import * as ui from '@/lib/ui';
import {
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

export default function EnvPane({}: Props) {
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
      <p className="p-4 text-center text-[12px] text-app-dim">
        Select a collection to manage environments.
      </p>
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
    <div className="flex flex-col gap-1.5 p-2.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className={`${ui.label} truncate`}>{activeCol.name} Env</h2>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={ui.iconBtn}
          title="Add environment"
          aria-label="Add environment"
        >
          <Plus size={14} aria-hidden="true" />
        </button>
      </div>

      <ul className="flex flex-col gap-1.5">
        {environments.map((env, i) => {
          const isEditing = editingId === env.id;
          const isActive = i === envIdx;
          return (
            <li key={env.id} data-selected={isActive || undefined} className={`${ui.row} flex-col items-stretch!`}>
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`size-1.5 shrink-0 rounded-full transition-colors duration-200 ${isActive ? 'bg-app-accent' : 'bg-app-dim'}`}
                />
                {isEditing ? (
                  <input
                    autoFocus
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null); }}
                    onBlur={commitRename}
                    aria-label={`Rename ${env.name}`}
                    className={`${ui.input} py-0.5`}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => dispatch(setEnvIdx({ collectionId: activeCol.id, envIdx: i }))}
                    onDoubleClick={() => { setEditingId(env.id); setEditDraft(env.name); }}
                    data-selected={isActive || undefined}
                    aria-current={isActive ? 'true' : undefined}
                    title="Click to activate, double-click to rename"
                    className={ui.rowSelect}
                  >
                    {env.name}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dispatch(duplicateEnvironment(env.id))}
                  className={`${ui.iconBtn} ${ui.dim}`}
                  title="Duplicate"
                  aria-label={`Duplicate ${env.name}`}
                >
                  <Copy size={13} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => { if (confirm(`Delete environment "${env.name}"?`)) dispatch(removeEnvironment(env.id)); }}
                  className={`${ui.iconBtnDanger} ${ui.dim}`}
                  title="Delete"
                  aria-label={`Delete ${env.name}`}
                >
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              </div>
              <p className={`${ui.meta} mt-1 pl-3.5`}>
                {Object.keys(env.vars).length} variables
              </p>
            </li>
          );
        })}
      </ul>

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
          aria-label="New environment name"
          className={ui.input}
        />
      )}
    </div>
  );
}
