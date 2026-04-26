import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './uiSlice';
import collectionsReducer from './collectionsSlice';
import environmentReducer from './environmentSlice';
import editorReducer from './editorSlice';
import runnerReducer from './runnerSlice';
import { scheduleSave } from '@/lib/persist';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    collections: collectionsReducer,
    environment: environmentReducer,
    editor: editorReducer,
    runner: runnerReducer,
  },
});

if (typeof window !== 'undefined') {
  store.subscribe(() => scheduleSave(store.getState() as Record<string, unknown>));
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
