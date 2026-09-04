"use client";

import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectCode, setCode } from "@/store/editorSlice";
import {
  selectCollections,
  selectActiveId,
  addItem,
  importCollections,
} from "@/store/collectionsSlice";
import { setSidebarTab } from "@/store/uiSlice";
import { downloadBlob, pickFile, readFileText } from "@/lib/fileUtils";
import { parseCurl, curlToScript } from "@/lib/curlParser";

/**
 * The collection file actions — save/import a script, export/import the
 * collection set, import a request from a curl command — as callbacks, split
 * out of `FilePane` so the command palette can run the same operations without
 * duplicating the dispatch logic.
 *
 * None of these prompt: `pickFile` already opens a cancelable native dialog,
 * and the export/save paths only download. `FilePane` still wraps the
 * non-curl actions in its own `ConfirmDialog`; callers that want a
 * confirmation own that themselves. `importCurl` takes the raw command text —
 * the caller supplies it (a dialog, a paste handler) and gets an `alert` back
 * on a parse failure, matching `FilePane`'s prior behavior.
 *
 * Every import switches the sidebar to the collections tab so the new item is
 * visible, except when there is no collection to import into — then the script
 * is only loaded into the editor buffer.
 *
 * `exportCollection` blanks every saved database password on its way out: the
 * file is the copy most likely to be shared, and unlike the synced account
 * copy it is protected by nothing.
 */
export function useFileActions() {
  const dispatch = useDispatch();
  const code = useSelector(selectCode);
  const collections = useSelector(selectCollections);
  const activeId = useSelector(selectActiveId);

  const targetCollectionId = (() => {
    if (activeId) {
      const owner = collections.find((c) =>
        c.items.some((i) => i.id === activeId),
      );
      if (owner) return owner.id;
    }
    return collections[0]?.id ?? null;
  })();

  const saveScript = useCallback(() => {
    const activeName = activeId
      ? collections.flatMap((c) => c.items).find((i) => i.id === activeId)?.name
      : "script";
    const safe = (activeName || "script")
      .replace(/[^\w\-]+/g, "_")
      .toLowerCase();
    downloadBlob(`${safe}.ts`, code, "text/typescript");
  }, [activeId, collections, code]);

  const importScript = useCallback(async () => {
    const file = await pickFile(
      ".ts,.js,.txt,text/typescript,text/javascript,text/plain",
    );
    if (!file) return;
    const text = await readFileText(file);
    dispatch(setCode(text));
    if (targetCollectionId) {
      dispatch(
        addItem({
          collectionId: targetCollectionId,
          name: file.name.replace(/\.[^.]+$/, ""),
          method: "GET",
          code: text,
        }),
      );
      dispatch(setSidebarTab("collections"));
    }
  }, [dispatch, targetCollectionId]);

  const exportCollection = useCallback(() => {
    // An exported file is the copy most likely to be mailed or committed, so
    // database passwords are blanked out of it. Everything else about a
    // connection travels, leaving the importer one field to fill in rather
    // than a connection to rebuild.
    const safeCollections = collections.map((c) =>
      c.connections?.length
        ? { ...c, connections: c.connections.map((conn) => ({ ...conn, password: "" })) }
        : c,
    );
    const json = JSON.stringify({ collections: safeCollections }, null, 2);
    downloadBlob(
      `bulky-collections-${Date.now()}.json`,
      json,
      "application/json",
    );
  }, [collections]);

  const importCollection = useCallback(async () => {
    const file = await pickFile(".json,application/json");
    if (!file) return;
    try {
      const text = await readFileText(file);
      const json = JSON.parse(text);
      const imported = json.collections
        ? json.collections
        : Array.isArray(json)
          ? json
          : [json];

      // Handle legacy format with top-level environments
      if (json.environments?.length) {
        for (const col of imported) {
          if (!col.environments || col.environments.length === 0) {
            col.environments = JSON.parse(JSON.stringify(json.environments));
            col.envIdx = json.envIdx || 0;
          }
        }
      }

      dispatch(importCollections(imported));
      dispatch(setSidebarTab("collections"));
    } catch {
      alert("Failed to parse collection JSON.");
    }
  }, [dispatch]);

  const importCurl = useCallback(
    (input: string) => {
      const parsed = parseCurl(input);
      if (!parsed) {
        alert("Could not parse curl command.");
        return;
      }
      const script = curlToScript(parsed);
      if (targetCollectionId) {
        const u = new URL(parsed.url);
        const name = `${parsed.method} ${u.pathname || u.host}`.slice(0, 40);
        dispatch(
          addItem({
            collectionId: targetCollectionId,
            name,
            method: parsed.method,
            code: script,
          }),
        );
        dispatch(setSidebarTab("collections"));
      } else {
        dispatch(setCode(script));
      }
    },
    [dispatch, targetCollectionId],
  );

  return {
    saveScript,
    importScript,
    exportCollection,
    importCollection,
    importCurl,
  };
}
