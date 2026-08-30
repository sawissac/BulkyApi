'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Feather, Package2, Plus, Copy, TableProperties, Trash2 } from 'lucide-react';
import type { Theme } from '@/lib/themes';
import * as ui from '@/lib/ui';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ConfirmDialog from '@/components/ConfirmDialog';
import NewEnvironmentDialog from './NewEnvironmentDialog';
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
import { setSidebarTab } from '@/store/uiSlice';

type Props = { T: Theme };

/** Container that visually combines a `ButtonGroup`'s children, no border. */
const GROUP_BOX = 'rounded-md overflow-hidden';

/** Ghost button hover matching the rest of the app's icon controls. */
const GROUP_BTN = 'rounded-none hover:bg-app-hover hover:text-app-accent dark:hover:bg-app-hover';

const GROUP_BTN_DANGER =
  'rounded-none text-app-error hover:bg-app-error/10 hover:text-app-error dark:hover:bg-app-error/10';

/** Environment list: one bordered card, corner rows clipped to its radius by
 *  `overflow-hidden`, rows divided by `divide-y` instead of each row owning
 *  its own border/radius/gap — reads as one group, not a stack of blocks. */
const LIST = 'flex flex-col overflow-hidden rounded-md border border-app-border divide-y divide-app-border';

/**
 * Row block for one environment, flush edge-to-edge inside `LIST`. Always-on
 * `bg-app-hover` tint. Active state is a left accent bar (`border-l-2`, side-
 * scoped `border-l-*` color) rather than a full border, which would break
 * the card's continuous edges; the bar's border is always present and only
 * its color changes, so selecting a row never shifts layout.
 *
 * Note: the generic `border-{color}` Tailwind utility sets `border-color` on
 * all four sides regardless of which side has nonzero width. Using it here
 * (instead of `border-l-{color}`) previously collided with `LIST`'s
 * `divide-y` top border and leaked the accent color onto the row divider —
 * keep the color utility side-scoped to match `border-l-2`.
 */
const ROW =
  'group flex w-full items-center gap-2 border-l-2 border-l-transparent bg-app-hover px-2.5 py-1.5 ' +
  'transition-colors duration-200 hover:bg-app-selected ' +
  'data-selected:border-l-app-accent data-selected:bg-app-selected';

/**
 * Compact list of the active collection's environments, with inline rename,
 * activation, duplication, and deletion. The row a caller works in most often
 * — request-building — lives one tab over in {@link VarsPane}; this pane only
 * manages which environment is active and how many it has.
 *
 * @remarks
 * Status: stable — Type: pane
 *
 * State & behavior: `newEnvOpen` gates {@link NewEnvironmentDialog};
 * `pendingDelete` gates {@link ConfirmDialog} for deletion. Renaming is
 * inline — `editingId`/`editDraft` swap a single row's label for an
 * `Input`, committed on blur, Enter, or discarded on Escape. Activation is a
 * single click on the name; a double-click starts rename instead. No
 * component owns which environment is "active" beyond dispatching
 * `setEnvIdx` — that lives in the store. The view-variables control also
 * activates the row's environment, then dispatches `setSidebarTab('vars')`
 * to hand off to {@link VarsPane}.
 *
 * Variants: renders a "select a collection" empty state when no collection
 * is active, instead of the list. A collection with zero environments still
 * renders the list `ul`, but skips the `LIST` border — an empty bordered box
 * would render as a bare line under the header.
 *
 * Composition: renders {@link NewEnvironmentDialog} when adding and
 * {@link ConfirmDialog} when a delete is pending. The environment list is one
 * bordered `LIST` card with `divide-y` row separators, rather than gapped,
 * individually-rounded rows — each `ROW` is flush edge-to-edge and signals
 * active state with a left accent bar instead of a full border. Within a
 * row, view-variables, duplicate, and delete are grouped into one
 * `ButtonGroup`, revealed on row hover/focus via `ui.reveal`.
 *
 * Accessibility: the active row's name button carries `aria-current`. All
 * icon-only controls (add, view variables, duplicate, delete) have
 * `aria-label` naming the target environment. Their tooltips describe the
 * action.
 *
 * Test ids: rename field `env-pane-rename-input` (single instance — only one
 * row can be in edit mode at a time).
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases: an environment name typed as only whitespace is discarded on
 * both create and rename, leaving the prior name (or no environment) intact.
 *
 * Dependencies: `lucide-react`, `react-redux`, `@/components/ui/input`,
 * `@/components/ui/button`, `@/components/ui/button-group`,
 * `@/components/ui/tooltip`, `@/components/ConfirmDialog`,
 * `./NewEnvironmentDialog`, `@/store/collectionsSlice`, `@/store/uiSlice`.
 *
 * @example
 * ```tsx
 * <EnvPane T={theme} />
 * ```
 *
 * @see {@link VarsPane}
 * @see {@link NewEnvironmentDialog}
 */
export default function EnvPane({}: Props) {
  const dispatch = useDispatch();
  const activeCol = useSelector(selectActiveCollection);
  const environments = useSelector(selectEnvironments);
  const envIdx = useSelector(selectEnvIdx);
  const [newEnvOpen, setNewEnvOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  if (!activeCol) {
    return (
      <p className="p-4 text-center font-description text-[12px] text-app-dim">
        Select a collection to manage environments.
      </p>
    );
  }

  const commitRename = () => {
    if (editingId && editDraft.trim()) {
      dispatch(renameEnvironment({ id: editingId, name: editDraft.trim() }));
    }
    setEditingId(null);
  };

  return (
    <div className="flex flex-col gap-1 p-2">
      <div className="mb-0.5 flex items-center justify-between gap-2 px-0.5">
        <h2 className={`${ui.label} truncate`}>{activeCol.name} Env</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setNewEnvOpen(true)}
              className={ui.iconBtn}
              aria-label="Add environment"
            >
              <Plus size={14} aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Add environment</TooltipContent>
        </Tooltip>
      </div>

      <ul className={environments.length > 0 ? LIST : undefined}>
        {environments.map((env, i) => {
          const isEditing = editingId === env.id;
          const isActive = i === envIdx;
          const count = Object.keys(env.vars).length;
          return (
            <li
              key={env.id}
              data-selected={isActive || undefined}
              className={ROW}
            >
              <Package2
                size={13}
                aria-hidden="true"
                className={`shrink-0 transition-colors duration-200 ${isActive ? 'text-app-accent' : 'text-app-dim'}`}
              />
              {isEditing ? (
                <div className="min-w-0 flex-1">
                  <Input
                    autoFocus
                    icon={Feather}
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null); }}
                    onBlur={commitRename}
                    aria-label={`Rename ${env.name}`}
                    data-testid="env-pane-rename-input"
                    className="py-0.5"
                  />
                </div>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => dispatch(setEnvIdx({ collectionId: activeCol.id, envIdx: i }))}
                      onDoubleClick={() => { setEditingId(env.id); setEditDraft(env.name); }}
                      data-selected={isActive || undefined}
                      aria-current={isActive ? 'true' : undefined}
                      className={`flex min-w-0 flex-1 items-baseline gap-1.5 rounded-sm border-0 bg-transparent p-0 text-left transition-colors duration-200 hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-0 ${isActive ? 'text-app-bright' : 'text-app-text'}`}
                    >
                      <span className="truncate font-title text-[12px] font-semibold">{env.name}</span>
                      <span className={`${ui.meta} shrink-0`}>{count}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Click to activate, double-click to rename</TooltipContent>
                </Tooltip>
              )}
              <ButtonGroup className={`${GROUP_BOX} ${ui.reveal}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => {
                        dispatch(setEnvIdx({ collectionId: activeCol.id, envIdx: i }));
                        dispatch(setSidebarTab('vars'));
                      }}
                      aria-label={`View variables for ${env.name}`}
                      className={GROUP_BTN}
                    >
                      <TableProperties size={12} aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View variables</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => dispatch(duplicateEnvironment(env.id))}
                      aria-label={`Duplicate ${env.name}`}
                      className={GROUP_BTN}
                    >
                      <Copy size={12} aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Duplicate</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setPendingDelete({ id: env.id, name: env.name })}
                      aria-label={`Delete ${env.name}`}
                      className={GROUP_BTN_DANGER}
                    >
                      <Trash2 size={12} aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              </ButtonGroup>
            </li>
          );
        })}
      </ul>

      {newEnvOpen && (
        <NewEnvironmentDialog
          onCreate={(name) => {
            dispatch(addEnvironment({ collectionId: activeCol.id, name }));
            setNewEnvOpen(false);
          }}
          onClose={() => setNewEnvOpen(false)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete environment"
          message={`Delete environment "${pendingDelete.name}"? This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            dispatch(removeEnvironment(pendingDelete.id));
            setPendingDelete(null);
          }}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
