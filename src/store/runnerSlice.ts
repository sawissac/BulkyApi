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
