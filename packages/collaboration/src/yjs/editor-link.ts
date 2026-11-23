import type { YjsEditor, YjsEditorLink } from './yjs.types';

export const editorLink = (editor: () => YjsEditor | undefined): YjsEditorLink => ({
  getState: () => editor()?.state(),
  dispatch: (tr) => {
    editor()?.run((_state, apply) => {
      apply?.(tr);
      return true;
    });
  },
});
