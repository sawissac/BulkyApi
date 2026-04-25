import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { SAMPLE_CODE } from '@/lib/sampleData';

type EditorState = {
  code: string;
};

const initialState: EditorState = {
  code: SAMPLE_CODE,
};

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    setCode(state, action: PayloadAction<string>) {
      state.code = action.payload;
    },
  },
});

export const { setCode } = editorSlice.actions;
export default editorSlice.reducer;

export const selectCode = (s: { editor: EditorState }) => s.editor.code;
