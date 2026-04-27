import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import { INITIAL_ENVIRONMENTS, type Environment } from '@/lib/sampleData';

type EnvironmentState = {
  environments: Environment[];
  envIdx: number;
};

const initialState: EnvironmentState = {
  environments: INITIAL_ENVIRONMENTS,
  envIdx: 0,
};

const environmentSlice = createSlice({
  name: 'environment',
  initialState,
  reducers: {
    setEnvIdx(state, action: PayloadAction<number>) {
      state.envIdx = action.payload;
    },
    addEnvironment(state, action: PayloadAction<string>) {
      state.environments.push({ id: nanoid(), name: action.payload, vars: {} });
    },
    removeEnvironment(state, action: PayloadAction<string>) {
      const idx = state.environments.findIndex((e) => e.id === action.payload);
      if (idx < 0) return;
      state.environments.splice(idx, 1);
      if (state.envIdx >= state.environments.length) {
        state.envIdx = Math.max(0, state.environments.length - 1);
      }
    },
    renameEnvironment(state, action: PayloadAction<{ id: string; name: string }>) {
      const env = state.environments.find((e) => e.id === action.payload.id);
      if (env) env.name = action.payload.name;
    },
    setVar(state, action: PayloadAction<{ envId: string; key: string; value: string }>) {
      const env = state.environments.find((e) => e.id === action.payload.envId);
      if (env) env.vars[action.payload.key] = action.payload.value;
    },
    deleteVar(state, action: PayloadAction<{ envId: string; key: string }>) {
      const env = state.environments.find((e) => e.id === action.payload.envId);
      if (env) delete env.vars[action.payload.key];
    },
    renameVar(state, action: PayloadAction<{ envId: string; oldKey: string; newKey: string }>) {
      const { envId, oldKey, newKey } = action.payload;
      if (!newKey || newKey === oldKey) return;
      const env = state.environments.find((e) => e.id === envId);
      if (!env) return;
      env.vars[newKey] = env.vars[oldKey];
      delete env.vars[oldKey];
    },
    mergeEnvironments(state, action: PayloadAction<Environment[]>) {
      for (const env of action.payload) {
        state.environments.push({ id: nanoid(), name: env.name, vars: { ...env.vars } });
      }
    },
    duplicateEnvironment(state, action: PayloadAction<string>) {
      const src = state.environments.find((e) => e.id === action.payload);
      if (!src) return;
      state.environments.push({ id: nanoid(), name: `${src.name} Copy`, vars: { ...src.vars } });
    },
    hydrateEnvironment(_state, action: PayloadAction<EnvironmentState>) {
      return action.payload;
    },
  },
});

export const {
  setEnvIdx,
  addEnvironment,
  removeEnvironment,
  renameEnvironment,
  duplicateEnvironment,
  mergeEnvironments,
  setVar,
  deleteVar,
  renameVar,
  hydrateEnvironment,
} = environmentSlice.actions;
export default environmentSlice.reducer;

export const selectEnvironments = (s: { environment: EnvironmentState }) => s.environment.environments;
export const selectEnvIdx       = (s: { environment: EnvironmentState }) => s.environment.envIdx;
export const selectActiveEnv    = (s: { environment: EnvironmentState }) =>
  s.environment.environments[s.environment.envIdx];
const EMPTY_VARS: Record<string, string> = {};

export const selectEnvVars      = (s: { environment: EnvironmentState }) =>
  s.environment.environments[s.environment.envIdx]?.vars ?? EMPTY_VARS;
