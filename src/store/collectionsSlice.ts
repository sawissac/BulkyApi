import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import { INITIAL_COLLECTIONS, type Collection, type CollectionItem } from '@/lib/sampleData';

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
      state.collections.push({ id: nanoid(), name: action.payload, open: true, items: [] });
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
  },
});

export const {
  setActiveId,
  toggleCollectionOpen,
  addCollection,
  removeCollection,
  renameCollection,
  addItem,
  removeItem,
  renameItem,
  setItemMethod,
  saveItemCode,
  hydrateCollections,
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
