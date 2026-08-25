import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type AuthStatus = 'unknown' | 'signed-out' | 'signed-in';
export type SyncStatus = 'idle' | 'pulling' | 'pushing' | 'synced' | 'error';

type AuthState = {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  sync: SyncStatus;
  lastSyncedAt: number | null;
  /** False when the Supabase env vars are missing — the app runs local-only. */
  configured: boolean;
};

const initialState: AuthState = {
  status: 'unknown',
  userId: null,
  email: null,
  sync: 'idle',
  lastSyncedAt: null,
  configured: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setConfigured(state, action: PayloadAction<boolean>) {
      state.configured = action.payload;
      // Nothing to sign in to without a project, so the status resolves
      // immediately rather than sitting on 'unknown' forever.
      if (!action.payload) state.status = 'signed-out';
    },
    setSession(state, action: PayloadAction<{ userId: string; email: string | null }>) {
      state.status = 'signed-in';
      state.userId = action.payload.userId;
      state.email = action.payload.email;
    },
    clearSession(state) {
      state.status = 'signed-out';
      state.userId = null;
      state.email = null;
      state.sync = 'idle';
      state.lastSyncedAt = null;
    },
    setSyncStatus(state, action: PayloadAction<SyncStatus>) {
      state.sync = action.payload;
      if (action.payload === 'synced') state.lastSyncedAt = Date.now();
    },
  },
});

export const { setConfigured, setSession, clearSession, setSyncStatus } = authSlice.actions;
export default authSlice.reducer;

export const selectAuthStatus   = (s: { auth: AuthState }) => s.auth.status;
export const selectUserId       = (s: { auth: AuthState }) => s.auth.userId;
export const selectUserEmail    = (s: { auth: AuthState }) => s.auth.email;
export const selectSyncStatus   = (s: { auth: AuthState }) => s.auth.sync;
export const selectLastSyncedAt = (s: { auth: AuthState }) => s.auth.lastSyncedAt;
export const selectSupabaseConfigured = (s: { auth: AuthState }) => s.auth.configured;
