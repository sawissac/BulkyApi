import type { CollectionItem, Folder } from "./sampleData";

/**
 * One node of a collection's rendered sidebar tree — a folder (with its already
 * resolved children) or a request item. `depth` is 0 at the collection root and
 * increments per nesting level, so the renderer can indent without threading a
 * counter of its own.
 */
export type TreeNode =
  | { kind: "folder"; folder: Folder; depth: number; children: TreeNode[] }
  | { kind: "item"; item: CollectionItem; depth: number };

/**
 * Turns a collection's flat `folders` + `items` lists into a nested tree for
 * rendering. Within every container, folders come before items and each keeps
 * its order-of-appearance in the flat array (which is also what the Supabase
 * sync turns into `position`).
 *
 * Defensive against bad references so a corrupt snapshot still renders every
 * row: a folder or item whose parent id does not resolve is hoisted to the
 * root, and a `parentId` chain that loops back on itself is broken at the
 * repeat — the folder and its subtree render at the root rather than vanishing.
 */
export function buildTree(
  folders: Folder[],
  items: CollectionItem[],
): TreeNode[] {
  const byId = new Map(folders.map((f) => [f.id, f]));

  // A folder counts as rooted when walking `parentId` reaches `null` without
  // revisiting a folder. Anything else (missing parent, cycle) is drawn at root.
  const rootedParent = (f: Folder): string | null => {
    const seen = new Set<string>([f.id]);
    let cur = f.parentId;
    while (cur !== null) {
      if (seen.has(cur) || !byId.has(cur)) return null;
      seen.add(cur);
      cur = byId.get(cur)!.parentId;
    }
    return f.parentId !== null && byId.has(f.parentId) ? f.parentId : null;
  };

  const groupBy = <T>(rows: T[], keyOf: (row: T) => string | null) => {
    const map = new Map<string | null, T[]>();
    for (const row of rows) {
      const key = keyOf(row);
      const bucket = map.get(key);
      if (bucket) bucket.push(row);
      else map.set(key, [row]);
    }
    return map;
  };

  const childFolders = groupBy(folders, rootedParent);
  const childItems = groupBy(items, (it) =>
    it.folderId != null && byId.has(it.folderId) ? it.folderId : null,
  );

  const build = (parentId: string | null, depth: number): TreeNode[] => [
    ...(childFolders.get(parentId) ?? []).map(
      (folder): TreeNode => ({
        kind: "folder",
        folder,
        depth,
        children: build(folder.id, depth + 1),
      }),
    ),
    ...(childItems.get(parentId) ?? []).map(
      (item): TreeNode => ({ kind: "item", item, depth }),
    ),
  ];

  return build(null, 0);
}

/**
 * `rootId` plus the ids of every folder nested under it, to any depth. Used by
 * cascade delete to find the whole subtree a folder removal takes with it.
 * Cycle-safe.
 */
export function descendantFolderIds(
  folders: Folder[],
  rootId: string,
): Set<string> {
  const out = new Set<string>([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const f of folders) {
      if (f.parentId !== null && out.has(f.parentId) && !out.has(f.id)) {
        out.add(f.id);
        added = true;
      }
    }
  }
  return out;
}

/** Ids of the items whose `folderId` is in `folderIds`. */
export function itemIdsInFolders(
  items: CollectionItem[],
  folderIds: Set<string>,
): string[] {
  return items
    .filter((it) => it.folderId != null && folderIds.has(it.folderId))
    .map((it) => it.id);
}
