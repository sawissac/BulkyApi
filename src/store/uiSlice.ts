import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ThemeKey } from '@/lib/themes';

export type LayoutKey = 'balanced' | 'editor-focus';
export type ResponseView = 'cards' | 'waterfall';
export type SidebarTab = 'collections' | 'env' | 'vars' | 'file';

type UiState = {
  theme: ThemeKey;
  layout: LayoutKey;
  tweaksOpen: boolean;
  responseView: ResponseView;
  sidebarTab: SidebarTab;
};

const initialState: UiState = {
  theme: 'ocean',
  layout: 'editor-focus',
  tweaksOpen: false,
  responseView: 'cards',
  sidebarTab: 'collections',
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
    setResponseView(state, action: PayloadAction<ResponseView>) {
      state.responseView = action.payload;
    },
    setSidebarTab(state, action: PayloadAction<SidebarTab>) {
      state.sidebarTab = action.payload;
    },
    hydrateUi(_state, action: PayloadAction<UiState>) {
      return { ...initialState, ...action.payload };
    },
  },
});

export const { setTheme, setLayout, setTweaksOpen, setResponseView, setSidebarTab, hydrateUi } = uiSlice.actions;
export default uiSlice.reducer;

export const selectTheme        = (s: { ui: UiState }) => s.ui.theme;
export const selectLayout       = (s: { ui: UiState }) => s.ui.layout;
export const selectTweaksOpen   = (s: { ui: UiState }) => s.ui.tweaksOpen;
export const selectResponseView = (s: { ui: UiState }) => s.ui.responseView;
export const selectSidebarTab   = (s: { ui: UiState }) => s.ui.sidebarTab;
