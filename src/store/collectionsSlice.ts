import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { INITIAL_COLLECTIONS, type Collection } from '@/lib/sampleData';

type CollectionsState = {
  collections: Collection[];
  activeId: string | null;
};

const initialState: CollectionsState = {
  collections: INITIAL_COLLECTIONS,
  activeId: null,
};

const collectionsSlice = createSlice({
  name: 'collections',
  initialState,
  reducers: {
    setActiveId(state, action: PayloadAction<string | null>) {
      state.activeId = action.payload;
    },
    toggleCollectionOpen(state, action: PayloadAction<string>) {
      const col = state.collections.find((c) => c.id === action.payload);
      if (col) col.open = !col.open;
    },
  },
});

export const { setActiveId, toggleCollectionOpen } = collectionsSlice.actions;
export default collectionsSlice.reducer;

export const selectCollections = (s: { collections: CollectionsState }) => s.collections.collections;
export const selectActiveId    = (s: { collections: CollectionsState }) => s.collections.activeId;
