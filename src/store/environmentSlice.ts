import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
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
  },
});

export const { setEnvIdx } = environmentSlice.actions;
export default environmentSlice.reducer;

export const selectEnvironments = (s: { environment: EnvironmentState }) => s.environment.environments;
export const selectEnvIdx       = (s: { environment: EnvironmentState }) => s.environment.envIdx;
export const selectActiveEnv    = (s: { environment: EnvironmentState }) =>
  s.environment.environments[s.environment.envIdx];
export const selectEnvVars      = (s: { environment: EnvironmentState }) =>
  s.environment.environments[s.environment.envIdx]?.vars ?? {};
