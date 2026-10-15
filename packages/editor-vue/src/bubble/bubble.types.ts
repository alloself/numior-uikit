import type { EditorState } from '@numior/editor-core';
import type { ToolbarOptions } from '../toolbar/toolbar-items';

export interface NuiEditorBubbleProps {
  state: EditorState;
  options: ToolbarOptions;
  anchor: HTMLElement | null;
  open: boolean;
}
