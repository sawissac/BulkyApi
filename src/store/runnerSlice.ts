import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ApiCall, LogEntry } from '@/lib/types';

type RunnerState = {
  builtCalls: ApiCall[];
  logs: LogEntry[];
  running: boolean;
  runStartedAt: number | null;
  stepMode: boolean;
  paused: boolean;
};

const initialState: RunnerState = {
  builtCalls: [],
  logs: [],
  running: false,
  runStartedAt: null,
  stepMode: false,
  paused: false,
};

const runnerSlice = createSlice({
  name: 'runner',
  initialState,
  reducers: {
    setBuiltCalls(state, action: PayloadAction<ApiCall[]>) {
      state.builtCalls = action.payload;
    },
    syncAnalyzedCalls(state, action: PayloadAction<ApiCall[]>) {
      const oldCalls = state.builtCalls;
      const newCalls = action.payload;
      const result: ApiCall[] = new Array(newCalls.length);
      const usedOld = new Set<number>();

      // First pass: Exact matches by method and urlExpr
      for (let i = 0; i < newCalls.length; i++) {
        const nc = newCalls[i];
        const exactIdx = oldCalls.findIndex((oc, idx) => !usedOld.has(idx) && oc.method === nc.method && oc.urlExpr === nc.urlExpr);
        if (exactIdx !== -1) {
          usedOld.add(exactIdx);
          const existing = oldCalls[exactIdx];
          result[i] = {
            ...nc,
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
          };
        }
      }

      // Second pass: Index fallback for modified calls
      for (let i = 0; i < newCalls.length; i++) {
        if (result[i]) continue;
        
        if (!usedOld.has(i) && oldCalls[i]) {
          usedOld.add(i);
          const existing = oldCalls[i];
          result[i] = {
            ...newCalls[i],
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
          };
        } else {
          result[i] = newCalls[i];
        }
      }

      state.builtCalls = result;
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
      action: PayloadAction<{ calls: ApiCall[]; logs: LogEntry[] }>
    ) {
      state.builtCalls = action.payload.calls;
      state.logs = action.payload.logs;
    },
  },
});

export const {
  setBuiltCalls,
  syncAnalyzedCalls,
  setLogs,
  setRunning,
  setStepMode,
  setPaused,
  updateCallsAndLogs,
} = runnerSlice.actions;
export default runnerSlice.reducer;

export const selectBuiltCalls   = (s: { runner: RunnerState }) => s.runner.builtCalls;
export const selectLogs         = (s: { runner: RunnerState }) => s.runner.logs;
export const selectRunning      = (s: { runner: RunnerState }) => s.runner.running;
export const selectRunStartedAt = (s: { runner: RunnerState }) => s.runner.runStartedAt;
export const selectStepMode     = (s: { runner: RunnerState }) => s.runner.stepMode;
export const selectPaused       = (s: { runner: RunnerState }) => s.runner.paused;
