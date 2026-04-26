'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import {
  selectActiveEnv,
  setVar,
  deleteVar,
  renameVar,
} from '@/store/environmentSlice';

type Props = { T: Theme };

const SENSITIVE = ['token', 'key', 'Key', 'secret', 'password'];
const isSensitive = (k: string) => SENSITIVE.some((s) => k.includes(s));

type EditCell = { key: string; field: 'key' | 'value' } | null;

export default function VarsPane({ T }: Props) {
  const dispatch = useDispatch();
  const env = useSelector(selectActiveEnv);
  const [editCell, setEditCell] = useState<EditCell>(null);
  const [draft, setDraft] = useState('');
  const [addingKey, setAddingKey] = useState('');
  const [addingVal, setAddingVal] = useState('');
  const [showAdding, setShowAdding] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  if (!env) return null;

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

  const inputStyle: React.CSSProperties = {
    background: T.bg,
    border: `1px solid ${T.borderAccent}`,
    borderRadius: 4,
    padding: '2px 5px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: T.textBright,
    outline: 'none',
    width: '100%',
    minWidth: 0,
  };

  return (
    <div style={{ padding: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {env.name} Variables
        </span>
        <button
          onClick={() => setShowAdding(true)}
          style={{ background: 'transparent', border: 'none', color: T.cyanDim, cursor: 'pointer', lineHeight: 1, padding: '0 2px', display: 'flex', flexShrink: 0 }}
          title="Add Variable"
        >
          <Plus size={13} />
        </button>
      </div>

      {Object.entries(env.vars).map(([k, v]) => {
        const isEditingKey = editCell?.key === k && editCell.field === 'key';
        const isEditingVal = editCell?.key === k && editCell.field === 'value';
        const sensitive = isSensitive(k);
        const show = revealed[k];
        const display = sensitive && !show ? '•'.repeat(Math.min(v.length, 18)) : v;
        return (
          <div
            key={k}
            style={{
              marginBottom: 5,
              padding: 6,
              borderRadius: 6,
              border: `1px solid ${T.border}`,
              background: T.bgHover,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {/* Top row: key + actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
              {isEditingKey ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Tab') commitEdit(); if (e.key === 'Escape') setEditCell(null); }}
                  onBlur={commitEdit}
                  style={inputStyle}
                />
              ) : (
                <span
                  onClick={() => startEdit(k, 'key', k)}
                  style={{ flex: 1, minWidth: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: T.cyan, cursor: 'text', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  title={`{{${k}}} — click to rename`}
                >
                  {`{{${k}}}`}
                </span>
              )}
              {sensitive && (
                <button
                  onClick={() => setRevealed((r) => ({ ...r, [k]: !r[k] }))}
                  style={{ background: 'transparent', border: 'none', color: T.textDim, cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}
                  title={show ? 'Hide' : 'Reveal'}
                >
                  {show ? <EyeOff size={11} /> : <Eye size={11} />}
                </button>
              )}
              <button
                onClick={() => dispatch(deleteVar({ envId: env.id, key: k }))}
                style={{ background: 'transparent', border: 'none', color: T.error, cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0, opacity: 0.7 }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                title="Delete"
              >
                <Trash2 size={11} />
              </button>
            </div>
            {/* Value row */}
            <div style={{ minWidth: 0 }}>
              {isEditingVal ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Tab') commitEdit(); if (e.key === 'Escape') setEditCell(null); }}
                  onBlur={commitEdit}
                  style={inputStyle}
                />
              ) : (
                <span
                  onClick={() => startEdit(k, 'value', v)}
                  style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: T.textDim, cursor: 'text', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  title={v || 'Click to edit'}
                >
                  {display || <em style={{ opacity: 0.4 }}>empty</em>}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {showAdding && (
        <div style={{ marginTop: 6, padding: 6, borderRadius: 6, border: `1px solid ${T.borderAccent}`, background: T.bgHover, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <input
            autoFocus
            placeholder="key"
            value={addingKey}
            onChange={(e) => setAddingKey(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') { setShowAdding(false); setAddingKey(''); setAddingVal(''); } }}
            style={inputStyle}
          />
          <input
            placeholder="value"
            value={addingVal}
            onChange={(e) => setAddingVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') { setShowAdding(false); setAddingKey(''); setAddingVal(''); } }}
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setShowAdding(false); setAddingKey(''); setAddingVal(''); }}
              style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.textDim, fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={commitAdd}
              style={{ background: T.cyanFaint, border: `1px solid ${T.borderAccent}`, color: T.cyan, fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, cursor: 'pointer' }}
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
