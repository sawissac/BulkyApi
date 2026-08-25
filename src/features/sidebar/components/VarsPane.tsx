'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SquareDashedText, Feather, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import * as ui from '@/lib/ui';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ConfirmDialog from '@/components/ConfirmDialog';
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
const CELL_INPUT = 'py-0.5 font-mono text-[11px]';

/** Container that visually combines a `ButtonGroup`'s children, no border. */
const GROUP_BOX = 'rounded-md overflow-hidden';

/** Ghost button hover matching the rest of the app's icon controls. */
const GROUP_BTN = 'rounded-none hover:bg-app-hover hover:text-app-accent dark:hover:bg-app-hover';

const GROUP_BTN_DANGER =
  'rounded-none text-app-error hover:bg-app-error/10 hover:text-app-error dark:hover:bg-app-error/10';

/** Variable list: one bordered card, corner rows clipped to its radius by
 *  `overflow-hidden`, rows divided by `divide-y` instead of each row owning
 *  its own border/radius/gap — reads as one group, not a stack of blocks. */
const LIST = 'flex flex-col overflow-hidden rounded-md border border-app-border divide-y divide-app-border';

/** Row block for one variable, flush edge-to-edge inside `LIST`. Stacks the
 *  key line over the value line at reduced padding/gap so more variables fit
 *  on screen without a border/radius/gap per item. */
const ROW = 'group flex flex-col gap-0.5 bg-app-hover px-2.5 py-1.5 transition-colors duration-200 hover:bg-app-selected';

/**
 * Key/value editor for the active environment's variables — inline rename,
 * inline value edit, add, delete, and a reveal toggle for values whose key
 * looks sensitive (token/key/secret/password).
 *
 * @remarks
 * Status: stable — Type: pane
 *
 * State & behavior: `editCell`/`draft` track which single cell (a variable's
 * key or value) is being edited, swapping that cell for an `Input` committed
 * on blur/Enter/Tab, discarded on Escape. `showAdding`/`addingKey`/
 * `addingVal` gate a two-field add row appended below the list. `revealed`
 * is a per-key map of whether a sensitive value is shown in plaintext or
 * masked; non-sensitive values are never masked. `pendingDelete` gates
 * {@link ConfirmDialog} — delete never fires directly from the row.
 *
 * Variants: renders a "select a collection / create an environment" empty
 * state instead of the list when no environment is active.
 *
 * Composition: renders {@link ConfirmDialog} when a delete is pending. The
 * variable list is one bordered `LIST` card with `divide-y` row separators
 * rather than gapped, individually-rounded rows — each `ROW` stacks its key
 * and value lines and stays flush edge-to-edge. The reveal toggle (sensitive
 * keys only) and delete are grouped into one `ButtonGroup`, revealed on row
 * hover/focus via `ui.reveal`.
 *
 * Accessibility: every icon-only control (add, reveal/hide, delete) has an
 * `aria-label` naming the target variable; the reveal toggle also carries
 * `aria-pressed`. Key and value buttons have their own tooltip describing
 * the click-to-edit affordance. The key button shows a decorative
 * `SquareDashedText` icon beside the `{{key}}` label.
 *
 * Test ids: key input `` `vars-pane-key-input-${key}` ``, value input
 * `` `vars-pane-value-input-${key}` ``, new-variable inputs
 * `vars-pane-new-key-input` / `vars-pane-new-value-input` (all via the
 * shared `Input`, which derives its own clear-button id). Add/reveal/delete
 * controls carry only `aria-label` — no dynamic or duplicated accessible
 * name on screen, so no testid is needed there.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases: a key typed as only whitespace during rename is discarded,
 * leaving the original key intact; the same draft during add is trimmed and
 * a blank result skips the dispatch entirely.
 *
 * Dependencies: `lucide-react`, `react-redux`, `@/components/ui/input`,
 * `@/components/ui/button`, `@/components/ui/button-group`,
 * `@/components/ui/tooltip`, `@/components/ConfirmDialog`,
 * `@/store/collectionsSlice`.
 *
 * @example
 * ```tsx
 * <VarsPane T={theme} />
 * ```
 *
 * @see {@link EnvPane}
 */
export default function VarsPane({}: Props) {
  const dispatch = useDispatch();
  const env = useSelector(selectActiveEnv);
  const [editCell, setEditCell] = useState<EditCell>(null);
  const [draft, setDraft] = useState('');
  const [addingKey, setAddingKey] = useState('');
  const [addingVal, setAddingVal] = useState('');
  const [showAdding, setShowAdding] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [pendingDelete, setPendingDelete] = useState<{ key: string } | null>(null);

  if (!env) {
    return (
      <p className="p-4 text-center font-description text-[12px] text-app-dim">
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
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setShowAdding(true)}
              className={ui.iconBtn}
              aria-label="Add variable"
            >
              <Plus size={14} aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Add variable</TooltipContent>
        </Tooltip>
      </div>

      <ul className={LIST}>
        {Object.entries(env.vars).map(([k, v]) => {
          const isEditingKey = editCell?.key === k && editCell.field === 'key';
          const isEditingVal = editCell?.key === k && editCell.field === 'value';
          const sensitive = isSensitive(k);
          const show = revealed[k];
          const display = sensitive && !show ? '•'.repeat(Math.min(v.length, 18)) : v;
          return (
            <li key={k} className={ROW}>
              <div className="flex min-w-0 items-center gap-1">
                {isEditingKey ? (
                  <Input
                    autoFocus
                    icon={Feather}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Tab') commitEdit(); if (e.key === 'Escape') setEditCell(null); }}
                    onBlur={commitEdit}
                    aria-label={`Rename variable ${k}`}
                    data-testid={`vars-pane-key-input-${k}`}
                    className={CELL_INPUT}
                  />
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => startEdit(k, 'key', k)}
                        className="flex min-w-0 flex-1 items-center gap-1 rounded-sm border-0 bg-transparent p-0 text-left font-mono text-[11px] text-app-accent transition-colors duration-200 hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
                      >
                        <SquareDashedText size={11} aria-hidden="true" className="shrink-0" />
                        <span className="truncate">{`{{${k}}}`}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{`{{${k}}} — click to rename`}</TooltipContent>
                  </Tooltip>
                )}
                <ButtonGroup className={`${GROUP_BOX} ${ui.reveal}`}>
                  {sensitive && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setRevealed((r) => ({ ...r, [k]: !r[k] }))}
                          aria-label={show ? `Hide value of ${k}` : `Reveal value of ${k}`}
                          aria-pressed={!!show}
                          className={GROUP_BTN}
                        >
                          {show ? <EyeOff size={12} aria-hidden="true" /> : <Eye size={12} aria-hidden="true" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{show ? 'Hide value' : 'Reveal value'}</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setPendingDelete({ key: k })}
                        aria-label={`Delete variable ${k}`}
                        className={GROUP_BTN_DANGER}
                      >
                        <Trash2 size={12} aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </ButtonGroup>
              </div>

              {isEditingVal ? (
                <Input
                  autoFocus
                  icon={Feather}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Tab') commitEdit(); if (e.key === 'Escape') setEditCell(null); }}
                  onBlur={commitEdit}
                  aria-label={`Value of ${k}`}
                  data-testid={`vars-pane-value-input-${k}`}
                  className={CELL_INPUT}
                />
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => startEdit(k, 'value', v)}
                      aria-label={`Edit value of ${k}`}
                      className="w-full min-w-0 truncate rounded-sm border-0 bg-transparent p-0 text-left font-mono text-[11px] text-app-dim transition-colors duration-200 hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
                    >
                      {display || <em className="opacity-60">empty</em>}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{v || 'Click to edit'}</TooltipContent>
                </Tooltip>
              )}
            </li>
          );
        })}
      </ul>

      {showAdding && (
        <div className="mt-2 flex flex-col gap-1.5 rounded-md border-2 border-app-border-accent bg-app-hover p-2">
          <Input
            autoFocus
            icon={Plus}
            placeholder="key"
            aria-label="New variable key"
            value={addingKey}
            onChange={(e) => setAddingKey(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') cancelAdd(); }}
            data-testid="vars-pane-new-key-input"
            className={CELL_INPUT}
          />
          <Input
            icon={Plus}
            placeholder="value"
            aria-label="New variable value"
            value={addingVal}
            onChange={(e) => setAddingVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') cancelAdd(); }}
            data-testid="vars-pane-new-value-input"
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

      {pendingDelete && (
        <ConfirmDialog
          title="Delete variable"
          message={`Delete variable "${pendingDelete.key}"? This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            dispatch(deleteVar({ envId: env.id, key: pendingDelete.key }));
            setPendingDelete(null);
          }}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
