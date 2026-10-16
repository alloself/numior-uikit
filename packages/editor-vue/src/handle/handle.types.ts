import type { ChildSlot, EditorState, ElementNode } from '@numior/editor-core';
import type { NuiMenuEntry } from '@numior/vue';

export interface NuiEditorBlockHandleProps {
  state: EditorState;
  target: ChildSlot | undefined;
  dragging: boolean;
  blockMenu: (node: ElementNode) => NuiMenuEntry[];
}
