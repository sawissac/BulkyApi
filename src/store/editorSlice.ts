import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type EditorState = {
  code: string;
};

const initialState: EditorState = {
  code: '',
};

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    setCode(state, action: PayloadAction<string>) {
      state.code = action.payload;
    },
    hydrateEditor(_state, action: PayloadAction<EditorState>) {
      return action.payload;
    },
  },
});

export const { setCode, hydrateEditor } = editorSlice.actions;
export default editorSlice.reducer;

export const selectCode = (s: { editor: EditorState }) => s.editor.code;
