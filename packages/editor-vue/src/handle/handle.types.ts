import type { ChildSlot, EditorState } from '@numior/editor-core';

export interface NuiEditorBlockHandleProps {
  state: EditorState;
  target: ChildSlot | undefined;
  dragging: boolean;
}
