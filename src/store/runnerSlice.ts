import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ApiCall, LogEntry } from '@/lib/types';
import { removeItem } from './collectionsSlice';

type RunnerState = {
  builtCalls: ApiCall[];
  logs: LogEntry[];
  running: boolean;
  runStartedAt: number | null;
  stepMode: boolean;
  paused: boolean;
  callsByItemId: Record<string, ApiCall[]>;
  currentItemId: string | null;
  runCacheFlags: boolean[];
};

const initialState: RunnerState = {
  builtCalls: [],
  logs: [],
  running: false,
  runStartedAt: null,
  stepMode: false,
  paused: false,
  callsByItemId: {},
  currentItemId: null,
  runCacheFlags: [],
};

function applyStored(nc: ApiCall, existing: ApiCall): ApiCall {
  return {
    ...nc,
    url: existing.url,
    status: existing.status,
    statusCode: existing.statusCode,
    response: existing.response,
    responseHeaders: existing.responseHeaders,
    requestBody: existing.requestBody,
    requestHeaders: existing.requestHeaders,
    authInfo: existing.authInfo,
    duration: existing.duration,
    error: existing.error,
    timestamp: existing.timestamp,
    cache: existing.cache,
    isSse: existing.isSse,
    sseEvents: existing.sseEvents,
  };
}

/**
 * Merge stored run results onto freshly analyzed call stubs.
 * Pass 1 — exact method + url match (handles env-resolved URLs).
 * Pass 2 — positional fallback for dynamic URLs that the analyzer can't resolve.
 */
function mergeCalls(analyzedCalls: ApiCall[], storedCalls: ApiCall[]): ApiCall[] {
  if (storedCalls.length === 0) return analyzedCalls;

  const usedOld = new Set<number>();

  // Pass 1: exact method + url match
  const result = analyzedCalls.map((nc) => {
    const idx = storedCalls.findIndex(
      (oc, i) => !usedOld.has(i) && oc.method === nc.method && oc.url === nc.url,
    );
    if (idx === -1) return null;
    usedOld.add(idx);
    return applyStored(nc, storedCalls[idx]);
  });

  // Pass 2: positional fallback for unmatched calls (dynamic URLs)
  for (let i = 0; i < analyzedCalls.length; i++) {
    if (result[i]) continue;
    const stored = storedCalls[i];
    result[i] = stored && !usedOld.has(i) && stored.method === analyzedCalls[i].method
      ? (usedOld.add(i), applyStored(analyzedCalls[i], stored))
      : analyzedCalls[i];
  }

  return result as ApiCall[];
}

const runnerSlice = createSlice({
  name: 'runner',
  initialState,
  reducers: {
    setBuiltCalls(state, action: PayloadAction<ApiCall[]>) {
      state.builtCalls = action.payload;
      state.runCacheFlags = action.payload.map((c) => c.cache);
    },
    syncAnalyzedCalls(state, action: PayloadAction<ApiCall[]>) {
      state.builtCalls = mergeCalls(action.payload, state.builtCalls);
    },
    switchToItem(
      state,
      action: PayloadAction<{ itemId: string | null; analyzedCalls: ApiCall[] }>,
    ) {
      const { itemId, analyzedCalls } = action.payload;
      state.currentItemId = itemId;

      if (!itemId) {
        state.builtCalls = analyzedCalls;
        return;
      }

      const stored = state.callsByItemId[itemId] ?? [];
      state.builtCalls = mergeCalls(analyzedCalls, stored);
    },
    setLogs(state, action: PayloadAction<LogEntry[]>) {
      state.logs = action.payload;
    },
    setRunning(state, action: PayloadAction<boolean>) {
      state.running = action.payload;
      if (action.payload) state.runStartedAt = Date.now();
      if (!action.payload) state.paused = false;
    },
    setStepMode(state, action: PayloadAction<boolean>) {
      state.stepMode = action.payload;
    },
    setPaused(state, action: PayloadAction<boolean>) {
      state.paused = action.payload;
    },
    updateCallsAndLogs(
      state,
      action: PayloadAction<{ calls: ApiCall[]; logs: LogEntry[]; itemId: string | null }>,
    ) {
      // Restore user cache flags using snapshot taken at run start
      const calls = action.payload.calls.map((c, i) => ({
        ...c,
        cache: state.runCacheFlags[i] ?? false,
      }));

      if (action.payload.itemId === state.currentItemId) {
        state.builtCalls = calls;
        state.logs = action.payload.logs;
      }

      if (action.payload.itemId) {
        state.callsByItemId[action.payload.itemId] = calls;
      }
    },
    toggleCallCache(state, action: PayloadAction<number>) {
      const call = state.builtCalls[action.payload];
      if (call) call.cache = !call.cache;

      // Keep callsByItemId in sync
      if (state.currentItemId) {
        state.callsByItemId[state.currentItemId] = state.builtCalls.map((c) => ({ ...c }));
      }
    },
    hydrateRunner(_state, action: PayloadAction<Partial<RunnerState>>) {
      return {
        ...initialState,
        builtCalls: action.payload.builtCalls ?? [],
        callsByItemId: action.payload.callsByItemId ?? {},
        currentItemId: action.payload.currentItemId ?? null,
      };
    },
  },
  extraReducers: (builder) => {
    builder.addCase(removeItem, (state, action) => {
      delete state.callsByItemId[action.payload.itemId];
    });
  },
});

export const {
  setBuiltCalls,
  syncAnalyzedCalls,
  switchToItem,
  setLogs,
  setRunning,
  setStepMode,
  setPaused,
  updateCallsAndLogs,
  toggleCallCache,
  hydrateRunner,
} = runnerSlice.actions;
export default runnerSlice.reducer;

export const selectBuiltCalls   = (s: { runner: RunnerState }) => s.runner.builtCalls;
export const selectLogs         = (s: { runner: RunnerState }) => s.runner.logs;
export const selectRunning      = (s: { runner: RunnerState }) => s.runner.running;
export const selectRunStartedAt = (s: { runner: RunnerState }) => s.runner.runStartedAt;
export const selectStepMode     = (s: { runner: RunnerState }) => s.runner.stepMode;
export const selectPaused       = (s: { runner: RunnerState }) => s.runner.paused;
