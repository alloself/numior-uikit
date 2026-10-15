import type { EditorState } from '@numior/editor-core';
import type { ToolbarAction, ToolbarBlocks } from './toolbar-items';

export interface NuiEditorToolbarProps {
  state: EditorState;
  disabled?: boolean | undefined;
  controls?: string | undefined;
}

export interface NuiEditorToolbarButtonProps {
  action: ToolbarAction;
  disabled?: boolean | undefined;
}

export interface NuiEditorBlockMenuProps {
  blocks: ToolbarBlocks;
  disabled?: boolean | undefined;
}
