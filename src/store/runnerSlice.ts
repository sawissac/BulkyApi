import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ApiCall, LogEntry } from '@/lib/types';

type RunnerState = {
  builtCalls: ApiCall[];
  logs: LogEntry[];
  running: boolean;
};

const initialState: RunnerState = {
  builtCalls: [],
  logs: [],
  running: false,
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

export const { setBuiltCalls, setLogs, setRunning, updateCallsAndLogs } = runnerSlice.actions;
export default runnerSlice.reducer;

export const selectBuiltCalls = (s: { runner: RunnerState }) => s.runner.builtCalls;
export const selectLogs       = (s: { runner: RunnerState }) => s.runner.logs;
export const selectRunning    = (s: { runner: RunnerState }) => s.runner.running;
