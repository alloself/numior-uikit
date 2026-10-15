import type { EditorState } from '@numior/editor-core';

export interface NuiEditorBlockHandleProps {
  state: EditorState;
  index: number | undefined;
  dragging: boolean;
}
