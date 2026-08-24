"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ChevronRight, ChevronDown, FileText, Plus, Trash2, FolderPlus, Download, Pencil } from "lucide-react";
import type { Theme } from "@/lib/themes";
import type { CollectionItem } from "@/lib/sampleData";
import * as ui from "@/lib/ui";
import MethodPill from "@/components/MethodPill";
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
} from "@/store/collectionsSlice";
import { setCode } from "@/store/editorSlice";

type Props = { T: Theme };

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

/**
 * Row actions stay out of the way until the row is hovered or something inside
 * it takes focus — `group-focus-within` is what keeps them keyboard-reachable
 * rather than hover-only.
 */
const ROW_ACTION = `transition-opacity duration-200 ${ui.reveal}`;

export default function CollPane({}: Props) {
  const dispatch = useDispatch();
  const collections = useSelector(selectCollections);
  const activeId = useSelector(selectActiveId);

  const [editing, setEditing] = useState<{ kind: "coll" | "item"; id: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [addingColl, setAddingColl] = useState(false);
  const [collDraft, setCollDraft] = useState("");

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
      if (editing.kind === "coll") dispatch(renameCollection({ id: editing.id, name: v }));
      else dispatch(renameItem({ itemId: editing.id, name: v }));
    }
    setEditing(null);
  };

  const commitNewColl = () => {
    const v = collDraft.trim();
    if (v) dispatch(addCollection(v));
    setCollDraft("");
    setAddingColl(false);
  };

  const cycleMethod = (item: CollectionItem) => {
    const idx = METHODS.indexOf(item.method);
    const next = METHODS[(idx + 1) % METHODS.length];
    dispatch(setItemMethod({ itemId: item.id, method: next }));
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const imported = Array.isArray(json) ? json : [json];
        dispatch(importCollections(imported));
      } catch {
        alert("Failed to parse collection JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input
  };

  return (
    <div className="pt-1">
      <div className="flex items-center justify-between gap-2 px-2.5 py-1">
        <h2 className={ui.label}>Test Cases</h2>
        <div className="flex gap-0.5">
          <label className={`${ui.iconBtn} cursor-pointer`} title="Import collection">
            <input type="file" accept=".json" onChange={handleImport} className="sr-only" />
            <Download size={14} aria-hidden="true" />
            <span className="sr-only">Import collection</span>
          </label>
          <button
            type="button"
            onClick={() => setAddingColl(true)}
            title="New collection"
            aria-label="New collection"
            className={ui.iconBtn}
          >
            <FolderPlus size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {collections.map((col) => (
        <div key={col.id} className="mb-0.5">
          {/* Collection header — a solid block, not a bordered strip */}
          <div className="group flex items-center gap-1 bg-app-hover px-2 py-1.5">
            <button
              type="button"
              onClick={() => dispatch(toggleCollectionOpen(col.id))}
              aria-expanded={col.open}
              aria-label={col.open ? `Collapse ${col.name}` : `Expand ${col.name}`}
              className="flex size-6 shrink-0 items-center justify-center rounded-sm border-0 bg-transparent text-app-dim transition-colors duration-200 hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
            >
              {col.open ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
            </button>

            {editing?.kind === "coll" && editing.id === col.id ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(null); }}
                onBlur={commitEdit}
                aria-label={`Rename ${col.name}`}
                className={`${ui.input} py-0.5 text-[11px] font-bold uppercase tracking-[0.07em]`}
              />
            ) : (
              <button
                type="button"
                onClick={() => dispatch(toggleCollectionOpen(col.id))}
                onDoubleClick={() => startEdit("coll", col.id, col.name)}
                title="Double-click to rename"
                className="min-w-0 flex-1 truncate rounded-sm border-0 bg-transparent p-0 text-left text-[11px] font-bold uppercase tracking-[0.07em] text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
              >
                {col.name}
              </button>
            )}

            <button
              type="button"
              onClick={() => startEdit("coll", col.id, col.name)}
              title="Rename"
              aria-label={`Rename ${col.name}`}
              className={`${ui.iconBtn} size-6 ${ROW_ACTION}`}
            >
              <Pencil size={12} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => dispatch(addItem({ collectionId: col.id }))}
              title="Add test"
              aria-label={`Add test to ${col.name}`}
              className={`${ui.iconBtn} size-6 text-app-accent ${ROW_ACTION}`}
            >
              <Plus size={13} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => { if (confirm(`Delete collection "${col.name}"?`)) dispatch(removeCollection(col.id)); }}
              title="Delete collection"
              aria-label={`Delete collection ${col.name}`}
              className={`${ui.iconBtnDanger} size-6 ${ui.reveal}`}
            >
              <Trash2 size={12} aria-hidden="true" />
            </button>
          </div>

          {/* Items */}
          {col.open && col.items.map((item) => {
            const isActive = activeId === item.id;
            const isEditing = editing?.kind === "item" && editing.id === item.id;
            return (
              <div
                key={item.id}
                data-selected={isActive || undefined}
                className="group flex items-center gap-1.5 border-l-2 border-transparent py-1 pl-4 pr-2.5 transition-colors duration-200 hover:bg-app-hover data-selected:border-app-accent data-selected:bg-app-selected"
              >
                <FileText
                  size={13}
                  aria-hidden="true"
                  className={`shrink-0 ${isActive ? 'text-app-accent' : 'text-app-dim'}`}
                />

                {isEditing ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(null); }}
                    onBlur={commitEdit}
                    aria-label={`Rename ${item.name}`}
                    className={`${ui.input} py-0.5`}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    onDoubleClick={() => startEdit("item", item.id, item.name)}
                    aria-current={isActive ? 'true' : undefined}
                    title="Double-click to rename"
                    className={`min-w-0 flex-1 truncate rounded-sm border-0 bg-transparent p-0 text-left text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent ${isActive ? 'font-semibold text-app-bright' : 'text-app-text'}`}
                  >
                    {item.name}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => cycleMethod(item)}
                  title="Click to cycle method"
                  aria-label={`Method ${item.method}, click to change`}
                  className="shrink-0 rounded-md border-0 bg-transparent p-0 transition-transform duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
                >
                  <MethodPill method={item.method} sm focusable={false} />
                </button>
                <button
                  type="button"
                  onClick={() => dispatch(removeItem({ collectionId: col.id, itemId: item.id }))}
                  title="Delete"
                  aria-label={`Delete ${item.name}`}
                  className={`${ui.iconBtnDanger} size-6 ${ui.reveal}`}
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      ))}

      {/* New collection input */}
      {addingColl && (
        <div className="px-2.5 py-2">
          <input
            autoFocus
            value={collDraft}
            onChange={(e) => setCollDraft(e.target.value)}
            placeholder="Collection name…"
            aria-label="New collection name"
            onKeyDown={(e) => { if (e.key === "Enter") commitNewColl(); if (e.key === "Escape") { setAddingColl(false); setCollDraft(""); } }}
            onBlur={commitNewColl}
            className={ui.input}
          />
        </div>
      )}
    </div>
  );
}
