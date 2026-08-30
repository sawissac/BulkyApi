"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  FolderPlus,
  Download,
  Feather,
  Blend,
  BookCopy,
} from "lucide-react";
import type { Theme } from "@/lib/themes";
import type { CollectionItem } from "@/lib/sampleData";
import * as ui from "@/lib/ui";
import MethodPill from "@/components/MethodPill";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import NewCollectionDialog from "./NewCollectionDialog";
import ImportCollectionDialog from "./ImportCollectionDialog";
import CollectionHooksDialog from "./CollectionHooksDialog";
import {
  setActiveId,
  selectActiveId,
  selectCollections,
  toggleCollectionOpen,
  addCollection,
  importCollections,
  removeCollection,
  renameCollection,
  addItem,
  removeItem,
  renameItem,
  setItemMethod,
  setCollectionHook,
} from "@/store/collectionsSlice";
import { setCode } from "@/store/editorSlice";

type Props = { T: Theme };

/**
 * Row actions stay out of the way until the row is hovered or something inside
 * it takes focus — `group-focus-within` is what keeps them keyboard-reachable
 * rather than hover-only.
 */
const ROW_ACTION = `transition-opacity duration-200 ${ui.reveal}`;

/** Container that visually combines a `ButtonGroup`'s children, no border. */
const GROUP_BOX = "rounded-md overflow-hidden";

/** Ghost button hover matching the rest of the app's icon controls. */
const GROUP_BTN =
  "rounded-none hover:bg-app-hover hover:text-app-accent dark:hover:bg-app-hover";

const GROUP_BTN_DANGER =
  "rounded-none text-app-error hover:bg-app-error/10 hover:text-app-error dark:hover:bg-app-error/10";

/** Collection list: one bordered card, corner blocks clipped to its radius by
 *  `overflow-hidden`, collections divided by `divide-y` instead of each one
 *  owning its own margin — reads as one group, not a stack of blocks. A
 *  collection's own item rows sit inside its `divide-y` child and are
 *  unaffected — the divider only ever falls between two collections. */
const LIST =
  "mx-2 mb-2 flex flex-col overflow-hidden rounded-md border border-app-border divide-y divide-app-border";

/**
 * Collection/request tree — collapsible collections, each holding a list of
 * request items with inline rename, method-pill editing, add, and delete.
 *
 * @remarks
 * Status: stable — Type: pane
 *
 * State & behavior: `editing`/`draft` track which single collection or item
 * name is being edited, swapping that name for an `Input` committed on
 * Enter/blur, discarded on Escape. `newCollOpen` gates
 * {@link NewCollectionDialog}, `importOpen` gates
 * {@link ImportCollectionDialog}, `hooksFor` gates
 * {@link CollectionHooksDialog} and carries the target collection's id, name
 * and current hook scripts. `pendingDelete` gates {@link ConfirmDialog}
 * for both a collection (cascades to all its items) and a single item —
 * delete never fires directly from a row. Selecting an item dispatches both
 * `setActiveId` and `setCode` so the editor follows the click.
 *
 * Variants: an empty `collections` array skips the `LIST` card's border
 * entirely — an empty bordered box would render as a bare line under the
 * header — leaving just the header row.
 *
 * Composition: renders {@link NewCollectionDialog}, {@link
 * ImportCollectionDialog}, {@link CollectionHooksDialog} and
 * {@link ConfirmDialog} as needed. Collections are one bordered `LIST` card
 * with `divide-y` separators between collections, rather than gapped,
 * individually-margined blocks; each collection's header and its own item
 * rows share one flush block. Header actions (rename, add item, run hooks,
 * delete) and per-item delete are grouped into `ButtonGroup`s, revealed on
 * hover/focus via `ui.reveal`/`ROW_ACTION`. The run-hooks control shows an
 * accent dot when that collection has a non-empty pre-run or post-run script.
 *
 * Accessibility: the expand/collapse toggle carries `aria-expanded`; the
 * active item's select button carries `aria-current`. All icon-only
 * controls have an `aria-label` naming the target collection or item.
 *
 * Test ids: collection rename `coll-pane-rename-collection-input`, item
 * rename `coll-pane-rename-item-input` (single instance each — only one row
 * across the whole tree can be in edit mode at a time); per-collection
 * run-hooks control `` `coll-pane-hooks-button-${collectionId}` ``.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases: a collection or item name typed as only whitespace on rename
 * is discarded, leaving the original name intact.
 *
 * Dependencies: `lucide-react`, `react-redux`, `@/components/MethodPill`,
 * `@/components/ConfirmDialog`, `@/components/ui/input`,
 * `@/components/ui/button`, `@/components/ui/button-group`,
 * `@/components/ui/tooltip`, `./NewCollectionDialog`,
 * `./ImportCollectionDialog`, `./CollectionHooksDialog`,
 * `@/store/collectionsSlice`, `@/store/editorSlice`.
 *
 * @example
 * ```tsx
 * <CollPane T={theme} />
 * ```
 *
 * @see {@link EnvPane}
 * @see {@link VarsPane}
 */
export default function CollPane({}: Props) {
  const dispatch = useDispatch();
  const collections = useSelector(selectCollections);
  const activeId = useSelector(selectActiveId);

  const [editing, setEditing] = useState<{
    kind: "coll" | "item";
    id: string;
  } | null>(null);
  const [draft, setDraft] = useState("");
  const [newCollOpen, setNewCollOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [hooksFor, setHooksFor] = useState<{
    id: string;
    name: string;
    preRun: string;
    postRun: string;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "coll"; id: string; name: string }
    | { kind: "item"; collectionId: string; itemId: string; name: string }
    | null
  >(null);

  const onSelect = (item: CollectionItem) => {
    dispatch(setActiveId(item.id));
    dispatch(setCode(item.code));
  };

  const startEdit = (kind: "coll" | "item", id: string, current: string) => {
    setEditing({ kind, id });
    setDraft(current);
  };

  const commitEdit = () => {
    if (!editing) return;
    const v = draft.trim();
    if (v) {
      if (editing.kind === "coll")
        dispatch(renameCollection({ id: editing.id, name: v }));
      else dispatch(renameItem({ itemId: editing.id, name: v }));
    }
    setEditing(null);
  };

  const handleImportJson = (json: unknown) => {
    const imported = Array.isArray(json) ? json : [json];
    dispatch(importCollections(imported));
    setImportOpen(false);
  };

  return (
    <div className="pt-1">
      <div className="flex items-center justify-between gap-2 px-2.5 py-1">
        <h2 className={ui.label}>Requests</h2>
        <ButtonGroup className={GROUP_BOX}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setImportOpen(true)}
                aria-label="Import collection"
                className={GROUP_BTN}
              >
                <Download size={14} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import collection</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setNewCollOpen(true)}
                aria-label="New collection"
                className={GROUP_BTN}
              >
                <FolderPlus size={14} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New collection</TooltipContent>
          </Tooltip>
        </ButtonGroup>
      </div>

      <div className={collections.length > 0 ? LIST : undefined}>
        {collections.map((col) => (
          <div key={col.id}>
            {/* Collection header — a solid block, not a bordered strip */}
            <div className="group flex items-center gap-1 bg-app-hover px-2 py-1.5">
              <button
                type="button"
                onClick={() => dispatch(toggleCollectionOpen(col.id))}
                aria-expanded={col.open}
                aria-label={
                  col.open ? `Collapse ${col.name}` : `Expand ${col.name}`
                }
                className="flex size-6 shrink-0 items-center justify-center rounded-sm border-0 bg-transparent text-app-dim transition-colors duration-200 hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
              >
                {col.open ? (
                  <ChevronDown size={13} aria-hidden="true" />
                ) : (
                  <ChevronRight size={13} aria-hidden="true" />
                )}
              </button>
  
              {editing?.kind === "coll" && editing.id === col.id ? (
                <Input
                  autoFocus
                  icon={Feather}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit();
                    if (e.key === "Escape") setEditing(null);
                  }}
                  onBlur={commitEdit}
                  aria-label={`Rename ${col.name}`}
                  data-testid="coll-pane-rename-collection-input"
                  className="py-0.5 font-title text-[11px] font-semibold uppercase tracking-[0.07em]"
                />
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => dispatch(toggleCollectionOpen(col.id))}
                      onDoubleClick={() => startEdit("coll", col.id, col.name)}
                      className="min-w-0 flex-1 truncate rounded-sm border-0 bg-transparent p-0 text-left font-title text-[11px] font-semibold uppercase tracking-[0.07em] text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
                    >
                      {col.name}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Double-click to rename</TooltipContent>
                </Tooltip>
              )}
  
              <ButtonGroup className={`${GROUP_BOX} ${ROW_ACTION}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => startEdit("coll", col.id, col.name)}
                      aria-label={`Rename ${col.name}`}
                      className={GROUP_BTN}
                    >
                      <Feather size={12} aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Rename</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => dispatch(addItem({ collectionId: col.id }))}
                      aria-label={`Add request to ${col.name}`}
                      className={`${GROUP_BTN} text-app-accent hover:text-app-accent`}
                    >
                      <Plus size={12} aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add request</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        setHooksFor({
                          id: col.id,
                          name: col.name,
                          preRun: col.preRun ?? "",
                          postRun: col.postRun ?? "",
                        })
                      }
                      aria-label={`Edit run hooks for ${col.name}`}
                      data-testid={`coll-pane-hooks-button-${col.id}`}
                      className={`${GROUP_BTN} relative ${
                        col.preRun?.trim() || col.postRun?.trim()
                          ? "text-app-accent hover:text-app-accent"
                          : ""
                      }`}
                    >
                      <BookCopy size={12} aria-hidden="true" />
                      {(col.preRun?.trim() || col.postRun?.trim()) && (
                        <span
                          aria-hidden="true"
                          className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-app-accent"
                        />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {col.preRun?.trim() || col.postRun?.trim()
                      ? "Run hooks (set)"
                      : "Run hooks"}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        setPendingDelete({
                          kind: "coll",
                          id: col.id,
                          name: col.name,
                        })
                      }
                      aria-label={`Delete collection ${col.name}`}
                      className={GROUP_BTN_DANGER}
                    >
                      <Trash2 size={12} aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete collection</TooltipContent>
                </Tooltip>
              </ButtonGroup>
            </div>
  
            {/* Items */}
            {col.open &&
              col.items.map((item) => {
                const isActive = activeId === item.id;
                const isEditing =
                  editing?.kind === "item" && editing.id === item.id;
                return (
                  <div
                    key={item.id}
                    data-selected={isActive || undefined}
                    className="group flex items-center gap-1.5 border-l-2 border-transparent py-1 pl-4 pr-2.5 transition-colors duration-200 hover:bg-app-hover data-selected:border-app-accent data-selected:bg-app-selected"
                  >
                    <Blend
                      size={13}
                      aria-hidden="true"
                      className={`shrink-0 ${isActive ? "text-app-accent" : "text-app-dim"}`}
                    />
  
                    {isEditing ? (
                      <Input
                        autoFocus
                        icon={Feather}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          if (e.key === "Escape") setEditing(null);
                        }}
                        onBlur={commitEdit}
                        aria-label={`Rename ${item.name}`}
                        data-testid="coll-pane-rename-item-input"
                        className="py-0.5"
                      />
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => onSelect(item)}
                            onDoubleClick={() =>
                              startEdit("item", item.id, item.name)
                            }
                            aria-current={isActive ? "true" : undefined}
                            className={`min-w-0 flex-1 truncate rounded-sm border-0 bg-transparent p-0 text-left font-title text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent ${isActive ? "font-semibold text-app-bright" : "text-app-text"}`}
                          >
                            {item.name}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Double-click to rename</TooltipContent>
                      </Tooltip>
                    )}
  
                    <MethodPill
                      method={item.method}
                      sm
                      onMethodChange={(next) =>
                        dispatch(setItemMethod({ itemId: item.id, method: next }))
                      }
                      description="Click to change the method label. This is a visual indicator only and does not affect the actual request."
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingDelete({
                              kind: "item",
                              collectionId: col.id,
                              itemId: item.id,
                              name: item.name,
                            })
                          }
                          aria-label={`Delete ${item.name}`}
                          className={`${ui.iconBtnDanger} size-6 ${ui.reveal}`}
                        >
                          <Trash2 size={12} aria-hidden="true" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}
          </div>
        ))}
      </div>

      {newCollOpen && (
        <NewCollectionDialog
          onCreate={(name) => {
            dispatch(addCollection(name));
            setNewCollOpen(false);
          }}
          onClose={() => setNewCollOpen(false)}
        />
      )}

      {importOpen && (
        <ImportCollectionDialog
          onImport={handleImportJson}
          onClose={() => setImportOpen(false)}
        />
      )}

      {hooksFor && (
        <CollectionHooksDialog
          collectionName={hooksFor.name}
          preRun={hooksFor.preRun}
          postRun={hooksFor.postRun}
          onSave={({ preRun, postRun }) => {
            dispatch(
              setCollectionHook({
                collectionId: hooksFor.id,
                hook: "preRun",
                code: preRun,
              }),
            );
            dispatch(
              setCollectionHook({
                collectionId: hooksFor.id,
                hook: "postRun",
                code: postRun,
              }),
            );
            setHooksFor(null);
          }}
          onClose={() => setHooksFor(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={
            pendingDelete.kind === "coll" ? "Delete collection" : "Delete request"
          }
          message={
            pendingDelete.kind === "coll"
              ? `Delete collection "${pendingDelete.name}" and all its requests? This can't be undone.`
              : `Delete "${pendingDelete.name}"? This can't be undone.`
          }
          confirmLabel="Delete"
          onConfirm={() => {
            if (pendingDelete.kind === "coll")
              dispatch(removeCollection(pendingDelete.id));
            else
              dispatch(
                removeItem({
                  collectionId: pendingDelete.collectionId,
                  itemId: pendingDelete.itemId,
                }),
              );
            setPendingDelete(null);
          }}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
