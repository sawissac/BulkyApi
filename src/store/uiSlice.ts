import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ThemeKey } from '@/lib/themes';
import { removeItem } from './collectionsSlice';

export type LayoutKey = 'balanced' | 'editor-focus' | 'response-focus';
export type ResponseView = 'cards' | 'waterfall' | 'docs';
export type SidebarTab = 'collections' | 'env' | 'vars' | 'file';

type UiState = {
  theme: ThemeKey;
  layout: LayoutKey;
  tweaksOpen: boolean;
  responseView: ResponseView;
  sidebarTab: SidebarTab;
  viewByItemId: Record<string, ResponseView>;
  callTimeout: number;
};

const initialState: UiState = {
  theme: 'ocean',
  layout: 'editor-focus',
  tweaksOpen: false,
  responseView: 'cards',
  sidebarTab: 'collections',
  viewByItemId: {},
  callTimeout: 0,
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
    setResponseViewForItem(state, action: PayloadAction<{ itemId: string; view: ResponseView }>) {
      state.viewByItemId[action.payload.itemId] = action.payload.view;
    },
    setSidebarTab(state, action: PayloadAction<SidebarTab>) {
      state.sidebarTab = action.payload;
    },
    setCallTimeout(state, action: PayloadAction<number>) {
      state.callTimeout = action.payload;
    },
    hydrateUi(_state, action: PayloadAction<UiState>) {
      return { ...initialState, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder.addCase(removeItem, (state, action) => {
      delete state.viewByItemId[action.payload.itemId];
    });
  },
});

export const { setTheme, setLayout, setTweaksOpen, setResponseView, setResponseViewForItem, setSidebarTab, setCallTimeout, hydrateUi } = uiSlice.actions;
export default uiSlice.reducer;

export const selectTheme        = (s: { ui: UiState }) => s.ui.theme;
export const selectLayout       = (s: { ui: UiState }) => s.ui.layout;
export const selectTweaksOpen   = (s: { ui: UiState }) => s.ui.tweaksOpen;
export const selectResponseView    = (s: { ui: UiState }) => s.ui.responseView;
export const selectViewByItemId    = (s: { ui: UiState }) => s.ui.viewByItemId;
export const selectSidebarTab      = (s: { ui: UiState }) => s.ui.sidebarTab;
export const selectCallTimeout     = (s: { ui: UiState }) => s.ui.callTimeout;
