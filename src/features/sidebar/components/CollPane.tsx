"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ChevronRight, ChevronDown, FileText, Plus, Trash2, FolderPlus, Download } from "lucide-react";
import type { Theme } from "@/lib/themes";
import type { CollectionItem } from "@/lib/sampleData";
import { METHOD_CLR } from "@/lib/themes";
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

export default function CollPane({ T }: Props) {
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
      } catch (err) {
        alert("Failed to parse collection JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input
  };

  return (
    <div style={{ paddingTop: 4 }}>
      <div style={{ padding: "4px 10px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: T.textDim }}>
          Test Cases
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <label
            title="Import Collection"
            style={{ background: "transparent", border: "none", color: T.cyanDim, cursor: "pointer", lineHeight: 1, padding: "0 2px", display: "flex" }}
          >
            <input type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
            <Download size={13} />
          </label>
          <button
            onClick={() => setAddingColl(true)}
            title="New Collection"
            style={{ background: "transparent", border: "none", color: T.cyanDim, cursor: "pointer", lineHeight: 1, padding: "0 2px", display: "flex" }}
          >
            <FolderPlus size={13} />
          </button>
        </div>
      </div>

      {collections.map((col) => (
        <div key={col.id} style={{ marginBottom: 2 }}>
          {/* Collection header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 8px",
              cursor: "pointer",
              background: T.bgHover,
              borderTop: `1px solid ${T.border}`,
              borderBottom: `1px solid ${T.border}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.querySelectorAll<HTMLElement>(".coll-act").forEach((el) => (el.style.opacity = "1"));
            }}
            onMouseLeave={(e) => {
              e.currentTarget.querySelectorAll<HTMLElement>(".coll-act").forEach((el) => (el.style.opacity = "0"));
            }}
          >
            <div onClick={() => dispatch(toggleCollectionOpen(col.id))} style={{ display: "flex", alignItems: "center", color: T.textDim }}>
              {col.open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </div>
            {editing?.kind === "coll" && editing.id === col.id ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(null); }}
                onBlur={commitEdit}
                style={{ flex: 1, background: T.bg, border: `1px solid ${T.borderAccent}`, borderRadius: 4, padding: "1px 5px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 700, color: T.textBright, outline: "none", letterSpacing: "0.07em" }}
              />
            ) : (
              <span
                onClick={() => dispatch(toggleCollectionOpen(col.id))}
                onDoubleClick={() => startEdit("coll", col.id, col.name)}
                style={{ flex: 1, fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", color: T.textBright, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                title="Double-click to rename"
              >
                {col.name}
              </span>
            )}
            <button
              className="coll-act"
              onClick={(e) => { e.stopPropagation(); startEdit("coll", col.id, col.name); }}
              title="Rename"
              style={{ background: "transparent", border: "none", color: T.textDim, cursor: "pointer", padding: 0, opacity: 0, transition: "opacity 0.15s", fontSize: 10 }}
            >
              ✎
            </button>
            <button
              className="coll-act"
              onClick={(e) => { e.stopPropagation(); dispatch(addItem({ collectionId: col.id })); }}
              title="Add Test"
              style={{ background: "transparent", border: "none", color: T.cyan, cursor: "pointer", padding: 0, opacity: 0, transition: "opacity 0.15s", display: "flex" }}
            >
              <Plus size={12} />
            </button>
            <button
              className="coll-act"
              onClick={(e) => { e.stopPropagation(); if (confirm(`Delete collection "${col.name}"?`)) dispatch(removeCollection(col.id)); }}
              title="Delete Collection"
              style={{ background: "transparent", border: "none", color: T.error, cursor: "pointer", padding: 0, opacity: 0, transition: "opacity 0.15s", display: "flex" }}
            >
              <Trash2 size={11} />
            </button>
          </div>

          {/* Items */}
          {col.open && col.items.map((item) => {
            const isActive = activeId === item.id;
            const isEditing = editing?.kind === "item" && editing.id === item.id;
            const mc = METHOD_CLR[item.method] || T.textDim;
            return (
              <div
                key={item.id}
                onClick={() => !isEditing && onSelect(item)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "12px minmax(0,1fr) auto auto",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px 5px 18px",
                  cursor: "pointer",
                  background: isActive ? T.bgSelected : "transparent",
                  borderLeft: `2px solid ${isActive ? T.cyan : "transparent"}`,
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = T.bgHover;
                  e.currentTarget.querySelectorAll<HTMLElement>(".item-act").forEach((el) => (el.style.opacity = "1"));
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                  e.currentTarget.querySelectorAll<HTMLElement>(".item-act").forEach((el) => (el.style.opacity = "0"));
                }}
              >
                <FileText size={11} color={isActive ? T.cyan : T.textDim} />
                {isEditing ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(null); }}
                    onBlur={commitEdit}
                    style={{ background: T.bg, border: `1px solid ${T.borderAccent}`, borderRadius: 4, padding: "1px 5px", fontFamily: "'Poppins', sans-serif", fontSize: 11, color: T.textBright, outline: "none", minWidth: 0, width: "100%" }}
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => { e.stopPropagation(); startEdit("item", item.id, item.name); }}
                    style={{ fontFamily: "'Poppins', sans-serif", fontSize: 11, color: isActive ? T.textBright : T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    title="Double-click to rename"
                  >
                    {item.name}
                  </span>
                )}
                <button
                  className="item-act"
                  onClick={(e) => { e.stopPropagation(); cycleMethod(item); }}
                  title="Click to cycle method"
                  style={{
                    background: `${mc}18`,
                    border: `1px solid ${mc}30`,
                    color: mc,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8,
                    fontWeight: 700,
                    padding: "1px 4px",
                    borderRadius: 4,
                    cursor: "pointer",
                    transition: "opacity 0.15s",
                  }}
                >
                  {item.method}
                </button>
                <button
                  className="item-act"
                  onClick={(e) => { e.stopPropagation(); dispatch(removeItem({ collectionId: col.id, itemId: item.id })); }}
                  title="Delete"
                  style={{ background: "transparent", border: "none", color: T.error, cursor: "pointer", padding: 0, opacity: 0, transition: "opacity 0.15s", display: "flex" }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}
        </div>
      ))}

      {/* New collection input */}
      {addingColl && (
        <div style={{ padding: "8px 10px" }}>
          <input
            autoFocus
            value={collDraft}
            onChange={(e) => setCollDraft(e.target.value)}
            placeholder="Collection name…"
            onKeyDown={(e) => { if (e.key === "Enter") commitNewColl(); if (e.key === "Escape") { setAddingColl(false); setCollDraft(""); } }}
            onBlur={commitNewColl}
            style={{ width: "100%", background: T.bgHover, border: `1px solid ${T.borderAccent}`, borderRadius: 6, padding: "5px 8px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: T.textBright, outline: "none" }}
          />
        </div>
      )}
    </div>
  );
}
