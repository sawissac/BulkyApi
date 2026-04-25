import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ThemeKey } from '@/lib/themes';

export type LayoutKey = 'balanced' | 'editor-focus';

type UiState = {
  theme: ThemeKey;
  layout: LayoutKey;
  tweaksOpen: boolean;
};

const initialState: UiState = {
  theme: 'ocean',
  layout: 'editor-focus',
  tweaksOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeKey>) {
      state.theme = action.payload;
    },
    setLayout(state, action: PayloadAction<LayoutKey>) {
      state.layout = action.payload;
    },
    setTweaksOpen(state, action: PayloadAction<boolean>) {
      state.tweaksOpen = action.payload;
    },
  },
});

export const { setTheme, setLayout, setTweaksOpen } = uiSlice.actions;
export default uiSlice.reducer;

export const selectTheme   = (s: { ui: UiState }) => s.ui.theme;
export const selectLayout  = (s: { ui: UiState }) => s.ui.layout;
export const selectTweaksOpen = (s: { ui: UiState }) => s.ui.tweaksOpen;
