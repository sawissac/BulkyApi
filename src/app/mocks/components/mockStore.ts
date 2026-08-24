import { configureStore } from '@reduxjs/toolkit';
import uiReducer from '@/store/uiSlice';
import collectionsReducer from '@/store/collectionsSlice';
import editorReducer from '@/store/editorSlice';
import runnerReducer from '@/store/runnerSlice';

/**
 * A throwaway store for the component gallery.
 *
 * The app store in `@/store` subscribes to `scheduleSave`, so every dispatch it
 * sees is written to localforage. Store-bound panels previewed on this page get
 * this store instead, so poking at them in the gallery cannot overwrite real
 * collections, environments, or editor state.
 */
export function createMockStore() {
  return configureStore({
    reducer: {
      ui: uiReducer,
      collections: collectionsReducer,
      editor: editorReducer,
      runner: runnerReducer,
    },
  });
}
