"use client";

import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  FolderPlus,
  Folder,
  FolderOpen,
  Download,
  Feather,
  Blend,
  BookCopy,
  MoreHorizontal,
} from "lucide-react";
import type { Theme } from "@/lib/themes";
import type { CollectionItem } from "@/lib/sampleData";
import {
  buildTree,
  descendantFolderIds,
  itemIdsInFolders,
  type TreeNode,
} from "@/lib/collectionTree";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  addFolder,
  renameFolder,
  toggleFolderOpen,
  removeFolder,
  moveItem,
  moveFolder,
  moveCollection,
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

/** Collection list: one bordered card, corner blocks clipped to its radius by
 *  `overflow-hidden`, collections divided by `divide-y` instead of each one
 *  owning its own margin — reads as one group, not a stack of blocks. A
 *  collection's own item rows sit inside its `divide-y` child and are
 *  unaffected — the divider only ever falls between two collections.
 *  `bg-app-panel` backs it solid so the pane's dot-grid texture doesn't bleed
 *  through the card — folder and item rows still layer `bg-app-hover` /
 *  `bg-app-selected` on top for hover/active state. */
const LIST =
  "mx-2 mb-2 flex flex-col overflow-hidden rounded-md border border-app-border bg-app-panel divide-y divide-app-border";

/** Pixels a nesting level adds to a row's left inset, on top of the base pad. */
const INDENT_STEP = 14;
/** Deepest level that still indents — beyond this, rows stop marching right. */
const INDENT_CAP = 6;

/** A row's identity for the drag-hover marker: `kind:id`. */
type RowKey = string;

/** What is currently being dragged. Held in a ref, not state — it changes on
 *  drag start/end only and no render needs to react to it directly. */
type DragPayload =
  | { kind: "collection"; id: string }
  | { kind: "folder"; id: string; collectionId: string }
  | { kind: "item"; id: string; collectionId: string };

/** Where the pointer sits over the hovered row while a drag is in progress.
 *  `before` / `after` draw an insertion line at that edge; `inside` (folder
 *  rows only) highlights the folder as the drop container. */
type DropMark = { key: RowKey; edge: "before" | "after" | "inside" } | null;

/** Id of the next row after `id` in `arr` that also satisfies `sameContainer`,
 *  or `null` when `id` is the last of its container — the `beforeId` an
 *  "after this row" drop resolves to. */
function nextSiblingId<T extends { id: string }>(
  arr: T[],
  id: string,
  sameContainer: (row: T) => boolean,
): string | null {
  const from = arr.findIndex((r) => r.id === id);
  if (from < 0) return null;
  for (let i = from + 1; i < arr.length; i++) {
    if (sameContainer(arr[i])) return arr[i].id;
  }
  return null;
}

/**
 * Collection / folder / request tree — collapsible collections holding nested
 * folders and request items, each with inline rename, method-pill editing, add,
 * delete, drag-to-reorder and a keyboard move fallback.
 *
 * @remarks
 * Status: stable — Type: pane
 *
 * State & behavior: `editing` tracks the single collection, folder or item name
 * being edited (its `kind` widened from the pre-folders version), swapping that
 * name for an `Input` committed on Enter/blur, discarded on Escape; a folder
 * edit also carries its `collectionId` since {@link renameFolder} needs it.
 * `draft` holds the in-progress name. `newCollOpen` gates
 * {@link NewCollectionDialog}, `importOpen` gates
 * {@link ImportCollectionDialog}, `hooksFor` gates
 * {@link CollectionHooksDialog}. `pendingDelete` gates {@link ConfirmDialog}
 * for a collection (cascades to every folder and item), a folder (cascades to
 * every nested folder and item — the message names the request count) and a
 * single item; delete never fires straight from a row. `dragRef` holds the
 * {@link DragPayload} for the row being dragged; `dropMark` is the live
 * insertion hint over the hovered row. Selecting an item dispatches both
 * `setActiveId` and `setCode` so the editor follows the click.
 *
 * The tree is derived per collection by {@link buildTree} from the flat
 * `folders` + `items` arrays; folders render before items at each level and
 * each keeps its array order. Reordering dispatches {@link moveItem} /
 * {@link moveFolder} / {@link moveCollection} with a `beforeId` anchor
 * (`null` = end of container). A folder cascade delete first dispatches
 * {@link removeItem} for every descendant item, so the runner/ui cross-slice
 * cleanup runs, then {@link removeFolder}.
 *
 * Variants: an empty `collections` array skips the `LIST` card's border
 * entirely, leaving just the header row. A collapsed collection or folder hides
 * its subtree. A folder with no children still shows its row.
 *
 * Composition: renders {@link NewCollectionDialog},
 * {@link ImportCollectionDialog}, {@link CollectionHooksDialog} and
 * {@link ConfirmDialog} as needed. Collections are one bordered `LIST` card
 * with `divide-y` between collections. Folder and item rows are indented by
 * nesting depth (capped). Each row keeps at most two always-visible actions —
 * "add request" (collection and folder rows) and, on the collection row, the
 * run-hooks toggle — and folds the rest (rename, add folder / subfolder, move
 * up, move down, delete) into a `⋯` {@link DropdownMenu} so a hovered row never
 * buries its own name. The run-hooks control shows an accent dot when that
 * collection has a non-empty pre-run or post-run script.
 *
 * Accessibility: expand/collapse toggles carry `aria-expanded`; the active
 * item's select button carries `aria-current`. All icon-only controls have an
 * `aria-label` naming the target. Native drag-and-drop is pointer-only, so the
 * `⋯` menu also carries "Move up" / "Move down" items — the keyboard path for
 * reordering — disabled at the ends of a container.
 *
 * Test ids: collection rename `coll-pane-rename-collection-input`, folder
 * rename `coll-pane-rename-folder-input`, item rename
 * `coll-pane-rename-item-input` (one instance each — only one row edits at a
 * time); per-collection run-hooks `` `coll-pane-hooks-button-${collectionId}` ``;
 * per-folder `` `coll-pane-folder-toggle-${folderId}` `` and
 * `` `coll-pane-folder-add-request-button-${folderId}` ``; per-row overflow
 * menu trigger `` `coll-pane-row-menu-button-${id}` `` with items
 * `` `coll-pane-menu-${action}-${id}` `` (`action` ∈ `add-folder`, `rename`,
 * `move-up`, `move-down`, `delete`; `id` is the collection, folder or item id).
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases: a name typed as only whitespace on rename is discarded. A folder
 * or item whose parent id does not resolve renders at the collection root
 * ({@link buildTree}). A folder cannot be dropped into itself or one of its own
 * descendants — the drop is refused and the reducer no-ops. Drag-and-drop stays
 * within one collection; a cross-collection drop is ignored.
 *
 * Dependencies: `lucide-react`, `react-redux`, `@/lib/collectionTree`,
 * `@/components/MethodPill`, `@/components/ConfirmDialog`,
 * `@/components/ui/input`, `@/components/ui/button`,
 * `@/components/ui/button-group`, `@/components/ui/tooltip`,
 * `@/components/ui/dropdown-menu`, `./NewCollectionDialog`,
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
    kind: "coll" | "folder" | "item";
    id: string;
    collectionId?: string;
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
    | {
        kind: "folder";
        collectionId: string;
        folderId: string;
        name: string;
        itemCount: number;
      }
    | { kind: "item"; collectionId: string; itemId: string; name: string }
    | null
  >(null);

  const dragRef = useRef<DragPayload | null>(null);
  const [dropMark, setDropMark] = useState<DropMark>(null);

  const onSelect = (item: CollectionItem) => {
    dispatch(setActiveId(item.id));
    dispatch(setCode(item.code));
  };

  const startEdit = (
    kind: "coll" | "folder" | "item",
    id: string,
    current: string,
    collectionId?: string,
  ) => {
    setEditing({ kind, id, collectionId });
    setDraft(current);
  };

  const commitEdit = () => {
    if (!editing) return;
    const v = draft.trim();
    if (v) {
      if (editing.kind === "coll")
        dispatch(renameCollection({ id: editing.id, name: v }));
      else if (editing.kind === "folder" && editing.collectionId)
        dispatch(
          renameFolder({
            collectionId: editing.collectionId,
            folderId: editing.id,
            name: v,
          }),
        );
      else dispatch(renameItem({ itemId: editing.id, name: v }));
    }
    setEditing(null);
  };

  const handleImportJson = (json: unknown) => {
    const imported = Array.isArray(json) ? json : [json];
    dispatch(importCollections(imported));
    setImportOpen(false);
  };

  const clearDrag = () => {
    dragRef.current = null;
    setDropMark(null);
  };

  const beginDrag = (e: React.DragEvent, payload: DragPayload) => {
    dragRef.current = payload;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", payload.id);
  };

  const edgeFromPointer = (
    e: React.DragEvent,
    withInside: boolean,
  ): "before" | "after" | "inside" => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    if (withInside && y > rect.height * 0.25 && y < rect.height * 0.75)
      return "inside";
    return y < rect.height / 2 ? "before" : "after";
  };

  const dragOverRow = (
    e: React.DragEvent,
    ctx:
      | { key: RowKey; kind: "collection"; id: string }
      | {
          key: RowKey;
          kind: "folder";
          collectionId: string;
          folderId: string;
          parentId: string | null;
        }
      | {
          key: RowKey;
          kind: "item";
          collectionId: string;
          folderId: string | null;
        },
  ) => {
    const p = dragRef.current;
    if (!p) return;

    if (p.kind === "collection") {
      if (ctx.kind !== "collection" || p.id === ctx.id) return;
      e.preventDefault();
      const edge = edgeFromPointer(e, false);
      setDropMark((m) => (m?.key === ctx.key && m.edge === edge ? m : { key: ctx.key, edge }));
      return;
    }

    if (ctx.kind === "collection") return;
    if (p.collectionId !== ctx.collectionId) return;

    let withInside = ctx.kind === "folder";
    if (p.kind === "folder" && ctx.kind === "folder") {
      if (p.id === ctx.folderId) return;
      const col = collections.find((c) => c.id === ctx.collectionId);
      if (col?.folders && descendantFolderIds(col.folders, p.id).has(ctx.folderId))
        return;
    }
    if (p.kind === "folder" && ctx.kind === "item") withInside = false;

    e.preventDefault();
    const edge = edgeFromPointer(e, withInside);
    setDropMark((m) => (m?.key === ctx.key && m.edge === edge ? m : { key: ctx.key, edge }));
  };

  const dropOnCollection = (targetId: string) => {
    const p = dragRef.current;
    const mark = dropMark;
    clearDrag();
    if (!p || !mark) return;

    if (p.kind === "collection") {
      if (p.id === targetId) return;
      const beforeId =
        mark.edge === "after"
          ? nextSiblingId(collections, targetId, () => true)
          : targetId;
      if (beforeId === p.id) return;
      dispatch(moveCollection({ id: p.id, beforeId }));
      return;
    }

    const col = collections.find((c) => c.id === targetId);
    if (!col || p.collectionId !== targetId) return;
    if (p.kind === "item")
      dispatch(
        moveItem({
          collectionId: targetId,
          itemId: p.id,
          targetFolderId: null,
          beforeId: null,
        }),
      );
    else
      dispatch(
        moveFolder({
          collectionId: targetId,
          folderId: p.id,
          targetParentId: null,
          beforeId: null,
        }),
      );
  };

  const dropOnFolder = (ctx: {
    collectionId: string;
    folderId: string;
    parentId: string | null;
  }) => {
    const p = dragRef.current;
    const mark = dropMark;
    clearDrag();
    if (!p || !mark || p.kind === "collection" || p.collectionId !== ctx.collectionId)
      return;
    const col = collections.find((c) => c.id === ctx.collectionId);
    if (!col?.folders) return;

    if (p.kind === "item") {
      if (mark.edge === "inside")
        dispatch(
          moveItem({
            collectionId: ctx.collectionId,
            itemId: p.id,
            targetFolderId: ctx.folderId,
            beforeId: null,
          }),
        );
      else {
        const firstItem = col.items.find(
          (i) => (i.folderId ?? null) === ctx.parentId,
        );
        dispatch(
          moveItem({
            collectionId: ctx.collectionId,
            itemId: p.id,
            targetFolderId: ctx.parentId,
            beforeId:
              firstItem && firstItem.id !== p.id ? firstItem.id : null,
          }),
        );
      }
      return;
    }

    if (p.id === ctx.folderId) return;
    if (descendantFolderIds(col.folders, p.id).has(ctx.folderId)) return;

    if (mark.edge === "inside") {
      dispatch(
        moveFolder({
          collectionId: ctx.collectionId,
          folderId: p.id,
          targetParentId: ctx.folderId,
          beforeId: null,
        }),
      );
    } else {
      const beforeId =
        mark.edge === "after"
          ? nextSiblingId(
              col.folders,
              ctx.folderId,
              (f) => f.parentId === ctx.parentId,
            )
          : ctx.folderId;
      dispatch(
        moveFolder({
          collectionId: ctx.collectionId,
          folderId: p.id,
          targetParentId: ctx.parentId,
          beforeId: beforeId === p.id ? null : beforeId,
        }),
      );
    }
  };

  const dropOnItem = (ctx: {
    collectionId: string;
    itemId: string;
    folderId: string | null;
  }) => {
    const p = dragRef.current;
    const mark = dropMark;
    clearDrag();
    if (!p || !mark || p.kind === "collection" || p.collectionId !== ctx.collectionId)
      return;
    const col = collections.find((c) => c.id === ctx.collectionId);
    if (!col) return;

    if (p.kind === "folder") {
      if (descendantFolderIds(col.folders ?? [], p.id).has(ctx.folderId ?? ""))
        return;
      dispatch(
        moveFolder({
          collectionId: ctx.collectionId,
          folderId: p.id,
          targetParentId: ctx.folderId,
          beforeId: null,
        }),
      );
      return;
    }

    if (p.id === ctx.itemId) return;
    const beforeId =
      mark.edge === "after"
        ? nextSiblingId(
            col.items,
            ctx.itemId,
            (i) => (i.folderId ?? null) === ctx.folderId,
          )
        : ctx.itemId;
    dispatch(
      moveItem({
        collectionId: ctx.collectionId,
        itemId: p.id,
        targetFolderId: ctx.folderId,
        beforeId: beforeId === p.id ? null : beforeId,
      }),
    );
  };

  const moveRow = (
    siblings: { id: string }[],
    id: string,
    dir: -1 | 1,
    apply: (beforeId: string | null) => void,
  ) => {
    const idx = siblings.findIndex((s) => s.id === id);
    if (idx < 0) return;
    if (dir === -1) {
      if (idx === 0) return;
      apply(siblings[idx - 1].id);
    } else {
      if (idx >= siblings.length - 1) return;
      apply(siblings[idx + 2]?.id ?? null);
    }
  };

  type MenuAction = {
    key: string;
    label: string;
    icon: React.ReactNode;
    onSelect: () => void;
    tone?: "danger";
    disabled?: boolean;
  };

  /**
   * The `⋯` overflow menu carried by every collection, folder and item row.
   * Folding the low-frequency actions (rename, reparent, reorder, delete) in
   * here keeps the row itself down to one or two always-visible controls, so a
   * hovered row never buries its own name in a strip of icons.
   */
  const rowMenu = (args: {
    id: string;
    label: string;
    actions: MenuAction[];
  }): React.ReactNode => {
    const { id, label, actions } = args;
    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`More actions for ${label}`}
                data-testid={`coll-pane-row-menu-button-${id}`}
                className={GROUP_BTN}
              >
                <MoreHorizontal size={12} aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>More actions</TooltipContent>
        </Tooltip>
        <DropdownMenuContent>
          {actions.map((a) =>
            a.key === "sep" ? (
              <DropdownMenuSeparator key={`sep-${id}`} />
            ) : (
              <DropdownMenuItem
                key={a.key}
                tone={a.tone}
                disabled={a.disabled}
                onSelect={a.onSelect}
                data-testid={`coll-pane-menu-${a.key}-${id}`}
              >
                {a.icon}
                {a.label}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const dropLine = (key: RowKey) =>
    dropMark?.key === key && dropMark.edge !== "inside" ? (
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 h-0.5 bg-app-accent ${
          dropMark.edge === "before" ? "top-0" : "bottom-0"
        }`}
      />
    ) : null;

  function renderFolderRow(
    node: Extract<TreeNode, { kind: "folder" }>,
    col: (typeof collections)[number],
  ): React.ReactNode {
    const { folder, depth } = node;
    const folders = col.folders ?? [];
    const siblings = folders.filter((f) => f.parentId === folder.parentId);
    const key = `folder:${folder.id}`;
    const isEditing = editing?.kind === "folder" && editing.id === folder.id;
    const inside = dropMark?.key === key && dropMark.edge === "inside";
    const pad = 8 + Math.min(depth, INDENT_CAP) * INDENT_STEP;

    return (
      <div key={key}>
        <div
          className={`group relative flex items-center gap-1 py-1 pr-2 transition-colors duration-200 hover:bg-app-hover ${
            inside ? "bg-app-selected ring-1 ring-inset ring-app-accent" : ""
          }`}
          style={{ paddingLeft: pad }}
          draggable={!isEditing}
          onDragStart={(e) =>
            beginDrag(e, {
              kind: "folder",
              id: folder.id,
              collectionId: col.id,
            })
          }
          onDragEnd={clearDrag}
          onDragOver={(e) =>
            dragOverRow(e, {
              key,
              kind: "folder",
              collectionId: col.id,
              folderId: folder.id,
              parentId: folder.parentId,
            })
          }
          onDragLeave={() => setDropMark((m) => (m?.key === key ? null : m))}
          onDrop={() =>
            dropOnFolder({
              collectionId: col.id,
              folderId: folder.id,
              parentId: folder.parentId,
            })
          }
        >
          {dropLine(key)}
          <button
            type="button"
            onClick={() =>
              dispatch(
                toggleFolderOpen({ collectionId: col.id, folderId: folder.id }),
              )
            }
            aria-expanded={folder.open}
            aria-label={folder.open ? `Collapse ${folder.name}` : `Expand ${folder.name}`}
            data-testid={`coll-pane-folder-toggle-${folder.id}`}
            className="flex size-5 shrink-0 items-center justify-center rounded-sm border-0 bg-transparent text-app-dim transition-colors duration-200 hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
          >
            {folder.open ? (
              <ChevronDown size={12} aria-hidden="true" />
            ) : (
              <ChevronRight size={12} aria-hidden="true" />
            )}
          </button>

          {folder.open ? (
            <FolderOpen size={13} aria-hidden="true" className="shrink-0 text-app-accent-dim" />
          ) : (
            <Folder size={13} aria-hidden="true" className="shrink-0 text-app-dim" />
          )}

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
              aria-label={`Rename ${folder.name}`}
              data-testid="coll-pane-rename-folder-input"
              className="py-0.5 font-title text-[11px] font-semibold"
            />
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() =>
                    dispatch(
                      toggleFolderOpen({
                        collectionId: col.id,
                        folderId: folder.id,
                      }),
                    )
                  }
                  onDoubleClick={() =>
                    startEdit("folder", folder.id, folder.name, col.id)
                  }
                  className="min-w-0 flex-1 truncate rounded-sm border-0 bg-transparent p-0 text-left font-title text-[11px] font-semibold text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
                >
                  {folder.name}
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
                  onClick={() =>
                    dispatch(addItem({ collectionId: col.id, folderId: folder.id }))
                  }
                  aria-label={`Add request to ${folder.name}`}
                  data-testid={`coll-pane-folder-add-request-button-${folder.id}`}
                  className={`${GROUP_BTN} text-app-accent hover:text-app-accent`}
                >
                  <Plus size={12} aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add request</TooltipContent>
            </Tooltip>
            {rowMenu({
              id: folder.id,
              label: folder.name,
              actions: [
                {
                  key: "add-folder",
                  label: "Add subfolder",
                  icon: <FolderPlus aria-hidden="true" />,
                  onSelect: () =>
                    dispatch(
                      addFolder({
                        collectionId: col.id,
                        parentId: folder.id,
                        name: "New Folder",
                      }),
                    ),
                },
                {
                  key: "rename",
                  label: "Rename",
                  icon: <Feather aria-hidden="true" />,
                  onSelect: () =>
                    startEdit("folder", folder.id, folder.name, col.id),
                },
                {
                  key: "move-up",
                  label: "Move up",
                  icon: <ChevronUp aria-hidden="true" />,
                  disabled: siblings.findIndex((f) => f.id === folder.id) <= 0,
                  onSelect: () =>
                    moveRow(siblings, folder.id, -1, (beforeId) =>
                      dispatch(
                        moveFolder({
                          collectionId: col.id,
                          folderId: folder.id,
                          targetParentId: folder.parentId,
                          beforeId,
                        }),
                      ),
                    ),
                },
                {
                  key: "move-down",
                  label: "Move down",
                  icon: <ChevronDown aria-hidden="true" />,
                  disabled:
                    siblings.findIndex((f) => f.id === folder.id) >=
                    siblings.length - 1,
                  onSelect: () =>
                    moveRow(siblings, folder.id, 1, (beforeId) =>
                      dispatch(
                        moveFolder({
                          collectionId: col.id,
                          folderId: folder.id,
                          targetParentId: folder.parentId,
                          beforeId,
                        }),
                      ),
                    ),
                },
                { key: "sep", label: "", icon: null, onSelect: () => {} },
                {
                  key: "delete",
                  label: "Delete folder",
                  icon: <Trash2 aria-hidden="true" />,
                  tone: "danger",
                  onSelect: () => {
                    const doomed = descendantFolderIds(folders, folder.id);
                    setPendingDelete({
                      kind: "folder",
                      collectionId: col.id,
                      folderId: folder.id,
                      name: folder.name,
                      itemCount: itemIdsInFolders(col.items, doomed).length,
                    });
                  },
                },
              ],
            })}
          </ButtonGroup>
        </div>

        {folder.open && node.children.map((child) => renderNode(child, col))}
      </div>
    );
  }

  function renderItemRow(
    node: Extract<TreeNode, { kind: "item" }>,
    col: (typeof collections)[number],
  ): React.ReactNode {
    const { item, depth } = node;
    const folderId = item.folderId ?? null;
    const siblings = col.items.filter((i) => (i.folderId ?? null) === folderId);
    const key = `item:${item.id}`;
    const isActive = activeId === item.id;
    const isEditing = editing?.kind === "item" && editing.id === item.id;
    const pad = 8 + Math.min(depth, INDENT_CAP) * INDENT_STEP;

    return (
      <div
        key={key}
        data-selected={isActive || undefined}
        className="group relative flex items-center gap-1.5 border-l-2 border-transparent py-1 pr-2.5 transition-colors duration-200 hover:bg-app-hover data-selected:border-app-accent data-selected:bg-app-selected"
        style={{ paddingLeft: pad + 8 }}
        draggable={!isEditing}
        onDragStart={(e) =>
          beginDrag(e, { kind: "item", id: item.id, collectionId: col.id })
        }
        onDragEnd={clearDrag}
        onDragOver={(e) =>
          dragOverRow(e, { key, kind: "item", collectionId: col.id, folderId })
        }
        onDragLeave={() => setDropMark((m) => (m?.key === key ? null : m))}
        onDrop={() => dropOnItem({ collectionId: col.id, itemId: item.id, folderId })}
      >
        {dropLine(key)}
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
                onDoubleClick={() => startEdit("item", item.id, item.name)}
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

        <ButtonGroup className={`${GROUP_BOX} ${ROW_ACTION}`}>
          {rowMenu({
            id: item.id,
            label: item.name,
            actions: [
              {
                key: "rename",
                label: "Rename",
                icon: <Feather aria-hidden="true" />,
                onSelect: () => startEdit("item", item.id, item.name),
              },
              {
                key: "move-up",
                label: "Move up",
                icon: <ChevronUp aria-hidden="true" />,
                disabled: siblings.findIndex((i) => i.id === item.id) <= 0,
                onSelect: () =>
                  moveRow(siblings, item.id, -1, (beforeId) =>
                    dispatch(
                      moveItem({
                        collectionId: col.id,
                        itemId: item.id,
                        targetFolderId: folderId,
                        beforeId,
                      }),
                    ),
                  ),
              },
              {
                key: "move-down",
                label: "Move down",
                icon: <ChevronDown aria-hidden="true" />,
                disabled:
                  siblings.findIndex((i) => i.id === item.id) >=
                  siblings.length - 1,
                onSelect: () =>
                  moveRow(siblings, item.id, 1, (beforeId) =>
                    dispatch(
                      moveItem({
                        collectionId: col.id,
                        itemId: item.id,
                        targetFolderId: folderId,
                        beforeId,
                      }),
                    ),
                  ),
              },
              { key: "sep", label: "", icon: null, onSelect: () => {} },
              {
                key: "delete",
                label: "Delete request",
                icon: <Trash2 aria-hidden="true" />,
                tone: "danger",
                onSelect: () =>
                  setPendingDelete({
                    kind: "item",
                    collectionId: col.id,
                    itemId: item.id,
                    name: item.name,
                  }),
              },
            ],
          })}
        </ButtonGroup>
      </div>
    );
  }

  function renderNode(
    node: TreeNode,
    col: (typeof collections)[number],
  ): React.ReactNode {
    return node.kind === "folder"
      ? renderFolderRow(node, col)
      : renderItemRow(node, col);
  }

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
        {collections.map((col) => {
          const key = `coll:${col.id}`;
          return (
            <div key={key}>
              <div
                className="group relative flex items-center gap-1 bg-app-hover px-2 py-1.5"
                draggable={!(editing?.kind === "coll" && editing.id === col.id)}
                onDragStart={(e) => beginDrag(e, { kind: "collection", id: col.id })}
                onDragEnd={clearDrag}
                onDragOver={(e) =>
                  dragOverRow(e, { key, kind: "collection", id: col.id })
                }
                onDragLeave={() => setDropMark((m) => (m?.key === key ? null : m))}
                onDrop={() => dropOnCollection(col.id)}
              >
                {dropLine(key)}
                <button
                  type="button"
                  onClick={() => dispatch(toggleCollectionOpen(col.id))}
                  aria-expanded={col.open}
                  aria-label={col.open ? `Collapse ${col.name}` : `Expand ${col.name}`}
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
                  {rowMenu({
                    id: col.id,
                    label: col.name,
                    actions: [
                      {
                        key: "add-folder",
                        label: "New folder",
                        icon: <FolderPlus aria-hidden="true" />,
                        onSelect: () =>
                          dispatch(
                            addFolder({
                              collectionId: col.id,
                              parentId: null,
                              name: "New Folder",
                            }),
                          ),
                      },
                      {
                        key: "rename",
                        label: "Rename",
                        icon: <Feather aria-hidden="true" />,
                        onSelect: () => startEdit("coll", col.id, col.name),
                      },
                      {
                        key: "move-up",
                        label: "Move up",
                        icon: <ChevronUp aria-hidden="true" />,
                        disabled:
                          collections.findIndex((c) => c.id === col.id) <= 0,
                        onSelect: () =>
                          moveRow(collections, col.id, -1, (beforeId) =>
                            dispatch(moveCollection({ id: col.id, beforeId })),
                          ),
                      },
                      {
                        key: "move-down",
                        label: "Move down",
                        icon: <ChevronDown aria-hidden="true" />,
                        disabled:
                          collections.findIndex((c) => c.id === col.id) >=
                          collections.length - 1,
                        onSelect: () =>
                          moveRow(collections, col.id, 1, (beforeId) =>
                            dispatch(moveCollection({ id: col.id, beforeId })),
                          ),
                      },
                      { key: "sep", label: "", icon: null, onSelect: () => {} },
                      {
                        key: "delete",
                        label: "Delete collection",
                        icon: <Trash2 aria-hidden="true" />,
                        tone: "danger",
                        onSelect: () =>
                          setPendingDelete({
                            kind: "coll",
                            id: col.id,
                            name: col.name,
                          }),
                      },
                    ],
                  })}
                </ButtonGroup>
              </div>

              {col.open &&
                buildTree(col.folders ?? [], col.items).map((n) =>
                  renderNode(n, col),
                )}
            </div>
          );
        })}
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
            pendingDelete.kind === "coll"
              ? "Delete collection"
              : pendingDelete.kind === "folder"
                ? "Delete folder"
                : "Delete request"
          }
          message={
            pendingDelete.kind === "coll"
              ? `Delete collection "${pendingDelete.name}" and all its requests? This can't be undone.`
              : pendingDelete.kind === "folder"
                ? `Delete folder "${pendingDelete.name}" and all ${pendingDelete.itemCount} request${
                    pendingDelete.itemCount === 1 ? "" : "s"
                  } inside it? This can't be undone.`
                : `Delete "${pendingDelete.name}"? This can't be undone.`
          }
          confirmLabel="Delete"
          onConfirm={() => {
            if (pendingDelete.kind === "coll") {
              dispatch(removeCollection(pendingDelete.id));
            } else if (pendingDelete.kind === "folder") {
              const col = collections.find(
                (c) => c.id === pendingDelete.collectionId,
              );
              const doomed = descendantFolderIds(
                col?.folders ?? [],
                pendingDelete.folderId,
              );
              for (const itemId of itemIdsInFolders(col?.items ?? [], doomed)) {
                dispatch(
                  removeItem({
                    collectionId: pendingDelete.collectionId,
                    itemId,
                  }),
                );
              }
              dispatch(
                removeFolder({
                  collectionId: pendingDelete.collectionId,
                  folderId: pendingDelete.folderId,
                }),
              );
            } else {
              dispatch(
                removeItem({
                  collectionId: pendingDelete.collectionId,
                  itemId: pendingDelete.itemId,
                }),
              );
            }
            setPendingDelete(null);
          }}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
