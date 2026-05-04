import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import { INITIAL_COLLECTIONS, type Collection, type CollectionItem, type Environment } from '@/lib/sampleData';

const RECENT_LIMIT = 6;

type CollectionsState = {
  collections: Collection[];
  activeId: string | null;
  recentItemIds: string[];
};

const initialState: CollectionsState = {
  collections: INITIAL_COLLECTIONS,
  activeId: null,
  recentItemIds: [],
};

function pushRecent(state: CollectionsState, id: string) {
  state.recentItemIds = [id, ...state.recentItemIds.filter((x) => x !== id)].slice(0, RECENT_LIMIT);
}

// Helper to find the collection containing a specific environment
function findCollectionForEnv(state: CollectionsState, envId: string): Collection | undefined {
  return state.collections.find(c => c.environments.some(e => e.id === envId));
}

// Removed getActiveCollection

const collectionsSlice = createSlice({
  name: 'collections',
  initialState,
  reducers: {
    setActiveId(state, action: PayloadAction<string | null>) {
      state.activeId = action.payload;
      if (action.payload) pushRecent(state, action.payload);
    },
    toggleCollectionOpen(state, action: PayloadAction<string>) {
      const col = state.collections.find((c) => c.id === action.payload);
      if (col) col.open = !col.open;
    },
    addCollection(state, action: PayloadAction<string>) {
      state.collections.push({ 
        id: nanoid(), 
        name: action.payload, 
        open: true, 
        items: [],
        environments: [],
        envIdx: 0
      });
    },
    importCollections(state, action: PayloadAction<Collection[]>) {
      const imported = action.payload;
      for (const col of imported) {
        // give fresh IDs to avoid collision
        col.id = nanoid();
        col.items.forEach((i) => (i.id = nanoid()));
        if (!col.environments) col.environments = [];
        col.environments.forEach((e) => (e.id = nanoid()));
        col.envIdx = col.envIdx || 0;
        state.collections.push(col);
      }
    },
    removeCollection(state, action: PayloadAction<string>) {
      const col = state.collections.find((c) => c.id === action.payload);
      if (col && state.activeId && col.items.some((i) => i.id === state.activeId)) state.activeId = null;
      state.collections = state.collections.filter((c) => c.id !== action.payload);
    },
    renameCollection(state, action: PayloadAction<{ id: string; name: string }>) {
      const col = state.collections.find((c) => c.id === action.payload.id);
      if (col && action.payload.name.trim()) col.name = action.payload.name;
    },
    addItem(state, action: PayloadAction<{ collectionId: string; name?: string; method?: string; code?: string }>) {
      const col = state.collections.find((c) => c.id === action.payload.collectionId);
      if (!col) return;
      const item: CollectionItem = {
        id: nanoid(),
        name: action.payload.name ?? 'New Test',
        method: action.payload.method ?? 'GET',
        code: action.payload.code ?? `// New Test\nconst r = await api.get(env.baseUrl + '/');\nconsole.log(r.status);\n`,
      };
      col.items.push(item);
      col.open = true;
      state.activeId = item.id;
      pushRecent(state, item.id);
    },
    removeItem(state, action: PayloadAction<{ collectionId: string; itemId: string }>) {
      const col = state.collections.find((c) => c.id === action.payload.collectionId);
      if (col) col.items = col.items.filter((i) => i.id !== action.payload.itemId);
      if (state.activeId === action.payload.itemId) state.activeId = null;
      state.recentItemIds = state.recentItemIds.filter((x) => x !== action.payload.itemId);
    },
    renameItem(state, action: PayloadAction<{ itemId: string; name: string }>) {
      if (!action.payload.name.trim()) return;
      for (const col of state.collections) {
        const item = col.items.find((i) => i.id === action.payload.itemId);
        if (item) { item.name = action.payload.name; return; }
      }
    },
    setItemMethod(state, action: PayloadAction<{ itemId: string; method: string }>) {
      for (const col of state.collections) {
        const item = col.items.find((i) => i.id === action.payload.itemId);
        if (item) { item.method = action.payload.method; return; }
      }
    },
    saveItemCode(state, action: PayloadAction<{ itemId: string; code: string }>) {
      for (const col of state.collections) {
        const item = col.items.find((i) => i.id === action.payload.itemId);
        if (item) { item.code = action.payload.code; return; }
      }
    },
    hydrateCollections(_state, action: PayloadAction<CollectionsState>) {
      return {
        ...action.payload,
        recentItemIds: action.payload.recentItemIds ?? [],
      };
    },
    // --- Environment Reducers ---
    setEnvIdx(state, action: PayloadAction<{ collectionId: string; envIdx: number }>) {
      const col = state.collections.find((c) => c.id === action.payload.collectionId);
      if (col) col.envIdx = action.payload.envIdx;
    },
    addEnvironment(state, action: PayloadAction<{ collectionId: string; name: string }>) {
      const col = state.collections.find((c) => c.id === action.payload.collectionId);
      if (col) {
        col.environments.push({ id: nanoid(), name: action.payload.name, vars: {} });
      }
    },
    removeEnvironment(state, action: PayloadAction<string>) {
      const col = findCollectionForEnv(state, action.payload);
      if (!col) return;
      const idx = col.environments.findIndex((e) => e.id === action.payload);
      if (idx < 0) return;
      col.environments.splice(idx, 1);
      if (col.envIdx >= col.environments.length) {
        col.envIdx = Math.max(0, col.environments.length - 1);
      }
    },
    renameEnvironment(state, action: PayloadAction<{ id: string; name: string }>) {
      const col = findCollectionForEnv(state, action.payload.id);
      if (!col) return;
      const env = col.environments.find((e) => e.id === action.payload.id);
      if (env) env.name = action.payload.name;
    },
    duplicateEnvironment(state, action: PayloadAction<string>) {
      const col = findCollectionForEnv(state, action.payload);
      if (!col) return;
      const src = col.environments.find((e) => e.id === action.payload);
      if (!src) return;
      col.environments.push({ id: nanoid(), name: `${src.name} Copy`, vars: { ...src.vars } });
    },
    mergeEnvironments(state, action: PayloadAction<{ collectionId: string; environments: Environment[] }>) {
      const col = state.collections.find((c) => c.id === action.payload.collectionId);
      if (!col) return;
      for (const env of action.payload.environments) {
        col.environments.push({ id: nanoid(), name: env.name, vars: { ...env.vars } });
      }
    },
    setVar(state, action: PayloadAction<{ envId: string; key: string; value: string }>) {
      const col = findCollectionForEnv(state, action.payload.envId);
      if (!col) return;
      const env = col.environments.find((e) => e.id === action.payload.envId);
      if (env) env.vars[action.payload.key] = action.payload.value;
    },
    deleteVar(state, action: PayloadAction<{ envId: string; key: string }>) {
      const col = findCollectionForEnv(state, action.payload.envId);
      if (!col) return;
      const env = col.environments.find((e) => e.id === action.payload.envId);
      if (env) delete env.vars[action.payload.key];
    },
    renameVar(state, action: PayloadAction<{ envId: string; oldKey: string; newKey: string }>) {
      const { envId, oldKey, newKey } = action.payload;
      if (!newKey || newKey === oldKey) return;
      const col = findCollectionForEnv(state, envId);
      if (!col) return;
      const env = col.environments.find((e) => e.id === envId);
      if (!env) return;
      env.vars[newKey] = env.vars[oldKey];
      delete env.vars[oldKey];
    },
  },
});

export const {
  setActiveId,
  toggleCollectionOpen,
  addCollection,
  importCollections,
  removeCollection,
  renameCollection,
  addItem,
  removeItem,
  renameItem,
  setItemMethod,
  saveItemCode,
  hydrateCollections,
  setEnvIdx,
  addEnvironment,
  removeEnvironment,
  renameEnvironment,
  duplicateEnvironment,
  mergeEnvironments,
  setVar,
  deleteVar,
  renameVar,
} = collectionsSlice.actions;
export default collectionsSlice.reducer;

export const selectCollections = (s: { collections: CollectionsState }) => s.collections.collections;
export const selectActiveId    = (s: { collections: CollectionsState }) => s.collections.activeId;

export const selectActiveItem = (s: { collections: CollectionsState }) => {
  const id = s.collections.activeId;
  if (!id) return null;
  for (const col of s.collections.collections) {
    const item = col.items.find((i) => i.id === id);
    if (item) return item;
  }
  return null;
};

export const selectActiveCollection = (s: { collections: CollectionsState }) => {
  const id = s.collections.activeId;
  if (!id) return null;
  return s.collections.collections.find((c) => c.items.some((i) => i.id === id)) ?? null;
};

export const selectRecentItems = (s: { collections: CollectionsState }) => {
  const all: CollectionItem[] = s.collections.collections.flatMap((c) => c.items);
  return s.collections.recentItemIds
    .map((id) => all.find((i) => i.id === id))
    .filter((x): x is CollectionItem => Boolean(x));
};

// --- Environment Selectors ---
export const selectEnvironments = (s: { collections: CollectionsState }) => {
  const col = selectActiveCollection(s);
  return col?.environments ?? [];
};

export const selectEnvIdx = (s: { collections: CollectionsState }) => {
  const col = selectActiveCollection(s);
  return col?.envIdx ?? 0;
};

export const selectActiveEnv = (s: { collections: CollectionsState }) => {
  const col = selectActiveCollection(s);
  if (!col || !col.environments.length) return undefined;
  return col.environments[col.envIdx];
};

const EMPTY_VARS: Record<string, string> = {};

export const selectEnvVars = (s: { collections: CollectionsState }) => {
  const col = selectActiveCollection(s);
  if (!col || !col.environments.length) return EMPTY_VARS;
  return col.environments[col.envIdx]?.vars ?? EMPTY_VARS;
};
