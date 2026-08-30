import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ThemeKey } from '@/lib/themes';
import { removeItem } from './collectionsSlice';

export type LayoutKey = 'balanced' | 'editor-focus' | 'response-focus';
export type ResponseView = 'cards' | 'waterfall' | 'docs';
export type SidebarTab = 'collections' | 'env' | 'vars' | 'file';
export type DisplayMode = 'browser' | 'fullscreen';

type UiState = {
  theme: ThemeKey;
  layout: LayoutKey;
  tweaksOpen: boolean;
  commandPaletteOpen: boolean;
  responseView: ResponseView;
  sidebarTab: SidebarTab;
  displayMode: DisplayMode;
  viewByItemId: Record<string, ResponseView>;
  callTimeout: number;
};

const initialState: UiState = {
  theme: 'ocean',
  layout: 'editor-focus',
  tweaksOpen: false,
  commandPaletteOpen: false,
  responseView: 'cards',
  sidebarTab: 'collections',
  displayMode: 'browser',
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
    setCommandPaletteOpen(state, action: PayloadAction<boolean>) {
      state.commandPaletteOpen = action.payload;
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
    setDisplayMode(state, action: PayloadAction<DisplayMode>) {
      state.displayMode = action.payload;
    },
    setCallTimeout(state, action: PayloadAction<number>) {
      state.callTimeout = action.payload;
    },
    hydrateUi(_state, action: PayloadAction<UiState>) {
      // A freshly loaded page never owns the screen, so the saved display mode
      // is dropped and the app always comes up in URL view; the palette is
      // never left open across a reload either, same reasoning.
      return {
        ...initialState,
        ...action.payload,
        displayMode: 'browser',
        commandPaletteOpen: false,
      };
    },
  },
  extraReducers: (builder) => {
    builder.addCase(removeItem, (state, action) => {
      delete state.viewByItemId[action.payload.itemId];
    });
  },
});

export const { setTheme, setLayout, setTweaksOpen, setCommandPaletteOpen, setResponseView, setResponseViewForItem, setSidebarTab, setDisplayMode, setCallTimeout, hydrateUi } = uiSlice.actions;
export default uiSlice.reducer;

export const selectTheme        = (s: { ui: UiState }) => s.ui.theme;
export const selectLayout       = (s: { ui: UiState }) => s.ui.layout;
export const selectTweaksOpen   = (s: { ui: UiState }) => s.ui.tweaksOpen;
export const selectCommandPaletteOpen = (s: { ui: UiState }) => s.ui.commandPaletteOpen;
export const selectResponseView    = (s: { ui: UiState }) => s.ui.responseView;
export const selectViewByItemId    = (s: { ui: UiState }) => s.ui.viewByItemId;
export const selectSidebarTab      = (s: { ui: UiState }) => s.ui.sidebarTab;
export const selectDisplayMode     = (s: { ui: UiState }) => s.ui.displayMode;
export const selectCallTimeout     = (s: { ui: UiState }) => s.ui.callTimeout;
