'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import * as ui from '@/lib/ui';
import {
  selectActiveEnv,
  setVar,
  deleteVar,
  renameVar,
} from '@/store/collectionsSlice';

type Props = { T: Theme };

const SENSITIVE = ['token', 'key', 'Key', 'secret', 'password'];
const isSensitive = (k: string) => SENSITIVE.some((s) => k.includes(s));

type EditCell = { key: string; field: 'key' | 'value' } | null;

/** Inline cell editor — mono, compact, hard accent border while focused. */
const CELL_INPUT = `${ui.input} py-0.5 font-mono text-[11px]`;

export default function VarsPane({}: Props) {
  const dispatch = useDispatch();
  const env = useSelector(selectActiveEnv);
  const [editCell, setEditCell] = useState<EditCell>(null);
  const [draft, setDraft] = useState('');
  const [addingKey, setAddingKey] = useState('');
  const [addingVal, setAddingVal] = useState('');
  const [showAdding, setShowAdding] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  if (!env) {
    return (
      <p className="p-4 text-center text-[12px] text-app-dim">
        Select a collection and create an environment to manage variables.
      </p>
    );
  }

  const commitEdit = () => {
    if (!editCell) return;
    const trimmed = draft;
    if (editCell.field === 'value') {
      dispatch(setVar({ envId: env.id, key: editCell.key, value: trimmed }));
    } else {
      const newKey = trimmed.trim();
      if (newKey && newKey !== editCell.key) {
        dispatch(renameVar({ envId: env.id, oldKey: editCell.key, newKey }));
      }
    }
    setEditCell(null);
  };

  const startEdit = (key: string, field: 'key' | 'value', current: string) => {
    setEditCell({ key, field });
    setDraft(current);
  };

  const commitAdd = () => {
    const k = addingKey.trim();
    if (k) dispatch(setVar({ envId: env.id, key: k, value: addingVal }));
    setAddingKey('');
    setAddingVal('');
    setShowAdding(false);
  };

  const cancelAdd = () => { setShowAdding(false); setAddingKey(''); setAddingVal(''); };

  return (
    <div className="p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className={`${ui.label} truncate`}>{env.name} Variables</h2>
        <button
          type="button"
          onClick={() => setShowAdding(true)}
          className={ui.iconBtn}
          title="Add variable"
          aria-label="Add variable"
        >
          <Plus size={14} aria-hidden="true" />
        </button>
      </div>

      <ul className="flex flex-col gap-1.5">
        {Object.entries(env.vars).map(([k, v]) => {
          const isEditingKey = editCell?.key === k && editCell.field === 'key';
          const isEditingVal = editCell?.key === k && editCell.field === 'value';
          const sensitive = isSensitive(k);
          const show = revealed[k];
          const display = sensitive && !show ? '•'.repeat(Math.min(v.length, 18)) : v;
          return (
            <li
              key={k}
              className="group flex flex-col gap-1 rounded-md border border-app-border bg-app-hover p-2"
            >
              {/* Key row */}
              <div className="flex min-w-0 items-center gap-1">
                {isEditingKey ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Tab') commitEdit(); if (e.key === 'Escape') setEditCell(null); }}
                    onBlur={commitEdit}
                    aria-label={`Rename variable ${k}`}
                    className={CELL_INPUT}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(k, 'key', k)}
                    title={`{{${k}}} — click to rename`}
                    className="min-w-0 flex-1 truncate rounded-sm border-0 bg-transparent p-0 text-left font-mono text-[11px] text-app-accent transition-colors duration-200 hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
                  >
                    {`{{${k}}}`}
                  </button>
                )}
                {sensitive && (
                  <button
                    type="button"
                    onClick={() => setRevealed((r) => ({ ...r, [k]: !r[k] }))}
                    className={ui.iconBtn}
                    title={show ? 'Hide value' : 'Reveal value'}
                    aria-label={show ? `Hide value of ${k}` : `Reveal value of ${k}`}
                    aria-pressed={!!show}
                  >
                    {show ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dispatch(deleteVar({ envId: env.id, key: k }))}
                  className={`${ui.iconBtnDanger} ${ui.dim}`}
                  title="Delete"
                  aria-label={`Delete variable ${k}`}
                >
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              </div>

              {/* Value row */}
              {isEditingVal ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Tab') commitEdit(); if (e.key === 'Escape') setEditCell(null); }}
                  onBlur={commitEdit}
                  aria-label={`Value of ${k}`}
                  className={CELL_INPUT}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => startEdit(k, 'value', v)}
                  title={v || 'Click to edit'}
                  aria-label={`Edit value of ${k}`}
                  className="w-full min-w-0 truncate rounded-sm border-0 bg-transparent p-0 text-left font-mono text-[11px] text-app-dim transition-colors duration-200 hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
                >
                  {display || <em className="opacity-60">empty</em>}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {showAdding && (
        <div className="mt-2 flex flex-col gap-1.5 rounded-md border-2 border-app-border-accent bg-app-hover p-2">
          <input
            autoFocus
            placeholder="key"
            aria-label="New variable key"
            value={addingKey}
            onChange={(e) => setAddingKey(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') cancelAdd(); }}
            className={CELL_INPUT}
          />
          <input
            placeholder="value"
            aria-label="New variable value"
            value={addingVal}
            onChange={(e) => setAddingVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') cancelAdd(); }}
            className={CELL_INPUT}
          />
          <div className="flex justify-end gap-1.5">
            <button type="button" onClick={cancelAdd} className={ui.ghostBtn}>
              Cancel
            </button>
            <button type="button" onClick={commitAdd} data-active className={ui.ghostBtn}>
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
