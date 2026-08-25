import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './uiSlice';
import collectionsReducer from './collectionsSlice';
import editorReducer from './editorSlice';
import runnerReducer from './runnerSlice';
import authReducer from './authSlice';
import { scheduleSave } from '@/lib/persist';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    collections: collectionsReducer,
    editor: editorReducer,
    runner: runnerReducer,
    auth: authReducer,
  },
});

if (typeof window !== 'undefined') {
  store.subscribe(() => scheduleSave(store.getState() as Record<string, unknown>));
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
