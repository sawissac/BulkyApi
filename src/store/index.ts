import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './uiSlice';
import collectionsReducer from './collectionsSlice';
import environmentReducer from './environmentSlice';
import editorReducer from './editorSlice';
import runnerReducer from './runnerSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    collections: collectionsReducer,
    environment: environmentReducer,
    editor: editorReducer,
    runner: runnerReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
