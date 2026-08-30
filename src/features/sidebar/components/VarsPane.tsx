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
  selectBaseVars,
  setVar,
  deleteVar,
  renameVar,
  setBaseVar,
  deleteBaseVar,
  renameBaseVar,
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
 *  its own border/radius/gap — reads as one group, not a stack of blocks.
 *  `bg-app-panel` backs it solid so the pane's dot-grid texture doesn't bleed
 *  through the card. */
const LIST = 'flex flex-col overflow-hidden rounded-md border border-app-border bg-app-panel divide-y divide-app-border';

/** Row block for one variable, flush edge-to-edge inside `LIST`. Stacks the
 *  key line over the value line at reduced padding/gap so more variables fit
 *  on screen without a border/radius/gap per item. */
const ROW = 'group flex flex-col gap-0.5 bg-app-hover px-2.5 py-1.5 transition-colors duration-200 hover:bg-app-selected';

/**
 * One key/value scope rendered as an editable list: click-to-rename key,
 * click-to-edit value, an add row, per-row delete behind a confirm, and a
 * reveal toggle for values whose key looks sensitive. {@link VarsPane} mounts
 * one of these per variable layer (global base, then the active environment).
 *
 * @remarks
 * Status: stable — Type: internal sub-component
 *
 * State & behavior: `editCell`/`draft` track the single cell being edited,
 * swapping it for an `Input` committed on blur/Enter/Tab and discarded on
 * Escape; a rename to whitespace or an unchanged key is dropped. `showAdding`
 * gates a two-field add row; a blank trimmed key skips the dispatch.
 * `revealed` is a per-key show/mask map for sensitive values only.
 * `pendingDelete` gates {@link ConfirmDialog} — delete never fires straight
 * from the row. Each instance owns its own state, so editing in one layer
 * leaves the other untouched.
 *
 * Variants: with zero variables the list `ul` still renders but drops the
 * `LIST` border, since an empty bordered box reads as a stray line; if
 * `emptyLabel` is set, it renders below the (empty) list instead of leaving
 * the section blank — hidden again once the add row opens, so the hint and
 * the add form never stack. A key present in `shadowedKeys` renders dimmed
 * with a strikethrough and a badge naming `shadowLabel` — the higher layer
 * overrides it at run time.
 *
 * Composition: an `h2` and an add button, then the list — one bordered `LIST`
 * card with `divide-y` row separators; each `ROW` stacks its key and value
 * lines. The reveal toggle
 * (sensitive keys only) and delete sit in one `ButtonGroup` revealed on row
 * hover/focus via `ui.reveal`. Renders {@link ConfirmDialog} when a delete is
 * pending.
 *
 * Accessibility: every icon-only control (add, reveal/hide, delete) has an
 * `aria-label` naming the target variable; the reveal toggle also carries
 * `aria-pressed`. Key and value buttons each carry a tooltip describing the
 * click-to-edit affordance. The key button shows a decorative
 * `SquareDashedText` icon beside the `{{key}}` label.
 *
 * Test ids: derived from `idPrefix` — key input
 * `` `${idPrefix}-key-input-${key}` ``, value input
 * `` `${idPrefix}-value-input-${key}` ``, new-variable inputs
 * `` `${idPrefix}-new-key-input` `` / `` `${idPrefix}-new-value-input` `` (all
 * via the shared `Input`, which derives its own clear-button id). Add, reveal
 * and delete carry only `aria-label`.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases: a key typed as only whitespace during rename is discarded and
 * the original key kept; during add the draft is trimmed and a blank result
 * skips the dispatch. Deleting a shadowed base key just removes the base
 * entry — the environment's own key is unaffected.
 *
 * Dependencies: `lucide-react`, `@/components/ui/input`,
 * `@/components/ui/button`, `@/components/ui/button-group`,
 * `@/components/ui/tooltip`, `@/components/ConfirmDialog`.
 */
function VarSection({
  title,
  vars,
  idPrefix,
  onSet,
  onRename,
  onDelete,
  shadowedKeys = [],
  shadowLabel,
  emptyLabel,
}: VarSectionProps) {
  const [editCell, setEditCell] = useState<EditCell>(null);
  const [draft, setDraft] = useState('');
  const [addingKey, setAddingKey] = useState('');
  const [addingVal, setAddingVal] = useState('');
  const [showAdding, setShowAdding] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [pendingDelete, setPendingDelete] = useState<{ key: string } | null>(null);

  const shadowed = new Set(shadowedKeys);

  const commitEdit = () => {
    if (!editCell) return;
    if (editCell.field === 'value') {
      onSet(editCell.key, draft);
    } else {
      const newKey = draft.trim();
      if (newKey && newKey !== editCell.key) onRename(editCell.key, newKey);
    }
    setEditCell(null);
  };

  const startEdit = (key: string, field: 'key' | 'value', current: string) => {
    setEditCell({ key, field });
    setDraft(current);
  };

  const commitAdd = () => {
    const k = addingKey.trim();
    if (k) onSet(k, addingVal);
    setAddingKey('');
    setAddingVal('');
    setShowAdding(false);
  };

  const cancelAdd = () => {
    setShowAdding(false);
    setAddingKey('');
    setAddingVal('');
  };

  const entries = Object.entries(vars);

  return (
    <section className="flex flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className={`${ui.label} truncate`}>{title}</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setShowAdding(true)}
              className={ui.iconBtn}
              aria-label={`Add variable to ${title}`}
            >
              <Plus size={14} aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Add variable</TooltipContent>
        </Tooltip>
      </div>

      <ul className={entries.length > 0 ? LIST : undefined}>
        {entries.map(([k, v]) => {
          const isEditingKey = editCell?.key === k && editCell.field === 'key';
          const isEditingVal = editCell?.key === k && editCell.field === 'value';
          const sensitive = isSensitive(k);
          const show = revealed[k];
          const isShadowed = shadowed.has(k);
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
                    data-testid={`${idPrefix}-key-input-${k}`}
                    className={CELL_INPUT}
                  />
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => startEdit(k, 'key', k)}
                        className={`flex min-w-0 flex-1 items-center gap-1 rounded-sm border-0 bg-transparent p-0 text-left font-mono text-[11px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent ${isShadowed ? 'text-app-dim line-through' : 'text-app-accent hover:text-app-bright'}`}
                      >
                        <SquareDashedText size={11} aria-hidden="true" className="shrink-0" />
                        <span className="truncate">{`{{${k}}}`}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isShadowed
                        ? `Overridden by ${shadowLabel ?? 'the active environment'} — click to rename`
                        : `{{${k}}} — click to rename`}
                    </TooltipContent>
                  </Tooltip>
                )}
                {isShadowed && (
                  <span className={`${ui.meta} shrink-0 rounded-sm bg-app-hover px-1 text-[10px] uppercase tracking-[0.06em]`}>
                    overridden
                  </span>
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
                  data-testid={`${idPrefix}-value-input-${k}`}
                  className={CELL_INPUT}
                />
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => startEdit(k, 'value', v)}
                      aria-label={`Edit value of ${k}`}
                      className={`w-full min-w-0 truncate rounded-sm border-0 bg-transparent p-0 text-left font-mono text-[11px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent ${isShadowed ? 'text-app-dim' : 'text-app-dim hover:text-app-text'}`}
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

      {entries.length === 0 && emptyLabel && !showAdding && (
        <p className="font-description text-[12px] text-app-dim">{emptyLabel}</p>
      )}

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
            data-testid={`${idPrefix}-new-key-input`}
            className={CELL_INPUT}
          />
          <Input
            icon={Plus}
            placeholder="value"
            aria-label="New variable value"
            value={addingVal}
            onChange={(e) => setAddingVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') cancelAdd(); }}
            data-testid={`${idPrefix}-new-value-input`}
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
            onDelete(pendingDelete.key);
            setPendingDelete(null);
          }}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}

type VarSectionProps = {
  /** Heading above the list, e.g. an environment's name. Also names the add
   *  button and is not otherwise parsed. */
  title: string;
  /** The variables this section shows and edits, keyed by name. */
  vars: Record<string, string>;
  /** Prefix for every `data-testid` this section renders — keep it unique per
   *  mounted section so the two lists never collide. */
  idPrefix: string;
  /** Upsert a variable. Fires on value-edit commit and on add commit (with a
   *  trimmed, non-empty key).
   *  @param key - variable name
   *  @param value - new value, taken verbatim (not trimmed) */
  onSet: (key: string, value: string) => void;
  /** Rename a key. Fires on key-edit commit only when the trimmed draft is
   *  non-empty and different from the old key.
   *  @param oldKey - current name
   *  @param newKey - trimmed new name */
  onRename: (oldKey: string, newKey: string) => void;
  /** Remove a variable. Fires after the delete is confirmed in
   *  {@link ConfirmDialog}.
   *  @param key - variable name to remove */
  onDelete: (key: string) => void;
  /** Keys in `vars` that a higher layer redefines — rendered struck through
   *  with an "overridden" badge.
   *  @defaultValue `[]` */
  shadowedKeys?: string[];
  /** Name of the layer that shadows `shadowedKeys`, shown in the row tooltip. */
  shadowLabel?: string;
  /** Hint shown in place of the list while `vars` has no entries — omit to
   *  leave the section blank (its prior behavior, still used by the
   *  environment section). */
  emptyLabel?: string;
};

/**
 * The Vars tab: every variable scope a script resolves, newest layer last.
 * A global **Base** section (inherited by every environment in every
 * collection) sits above the active environment's own variables; a key in the
 * environment overrides the same key in Base. Activation, rename and count of
 * environments themselves live one tab over in {@link EnvPane} — this pane
 * only edits values.
 *
 * @remarks
 * Status: stable — Type: pane
 *
 * State & behavior: holds no state itself — each {@link VarSection} owns its
 * own edit/add/reveal/delete state. Base edits dispatch `setBaseVar` /
 * `renameBaseVar` / `deleteBaseVar`; environment edits dispatch `setVar` /
 * `renameVar` / `deleteVar` scoped to the active environment's id. The Base
 * section passes the active environment's keys as `shadowedKeys` so overrides
 * are visible.
 *
 * Variants: the Base section always renders. The environment section renders
 * only when an environment is active; otherwise a one-line hint takes its
 * place. Either list drops its border while empty.
 *
 * Composition: two stacked {@link VarSection}s separated by a divider. No
 * dialog of its own — each section renders its own {@link ConfirmDialog} on a
 * pending delete.
 *
 * Accessibility: each section is a `section` with its own `h2`. All controls
 * are labelled by {@link VarSection}. The override badge is plain text, not an
 * ARIA live region.
 *
 * Test ids: Base section ids are prefixed `vars-pane-base-*`, the environment
 * section keeps `vars-pane-*` (key/value inputs `` `…-key-input-${key}` `` /
 * `` `…-value-input-${key}` ``, add-row inputs `` `…-new-key-input` `` /
 * `` `…-new-value-input` ``). Add/reveal/delete controls carry only
 * `aria-label`.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases: with no collection or no environment active, only the Base
 * section and the hint show — Base is still fully editable, and shows its own
 * `emptyLabel` hint if it also has no variables yet. A hydrated state with no
 * `baseVars` key comes up with an empty Base section, not a crash.
 *
 * Dependencies: `lucide-react`, `react-redux`, `@/store/collectionsSlice`,
 * and everything {@link VarSection} pulls in.
 *
 * @example
 * ```tsx
 * <VarsPane T={theme} />
 * ```
 *
 * @see {@link EnvPane}
 * @see {@link VarSection}
 */
export default function VarsPane({}: Props) {
  const dispatch = useDispatch();
  const env = useSelector(selectActiveEnv);
  const baseVars = useSelector(selectBaseVars);

  return (
    <div className="flex flex-col gap-3 p-2.5">
      <VarSection
        title="Base · all environments"
        vars={baseVars}
        idPrefix="vars-pane-base"
        onSet={(key, value) => dispatch(setBaseVar({ key, value }))}
        onRename={(oldKey, newKey) => dispatch(renameBaseVar({ oldKey, newKey }))}
        onDelete={(key) => dispatch(deleteBaseVar({ key }))}
        shadowedKeys={env ? Object.keys(env.vars) : []}
        shadowLabel={env?.name}
        emptyLabel="No global variables yet — add one below to share it across every environment."
      />

      <hr className="border-app-border" />

      {env ? (
        <VarSection
          title={`${env.name} Variables`}
          vars={env.vars}
          idPrefix="vars-pane"
          onSet={(key, value) => dispatch(setVar({ envId: env.id, key, value }))}
          onRename={(oldKey, newKey) =>
            dispatch(renameVar({ envId: env.id, oldKey, newKey }))
          }
          onDelete={(key) => dispatch(deleteVar({ envId: env.id, key }))}
        />
      ) : (
        <p className="font-description text-[12px] text-app-dim">
          Select a collection and create an environment for environment-specific
          variables.
        </p>
      )}
    </div>
  );
}
