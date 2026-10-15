import type { EditorState } from '@numior/editor-core';
import type {
  ToolbarBlocks,
  ToolbarColours,
  ToolbarFace,
  ToolbarGroup,
  ToolbarOptions,
} from './toolbar-items';

export interface NuiEditorToolbarProps {
  state: EditorState;
  options: ToolbarOptions;
  disabled?: boolean | undefined;
  controls?: string | undefined;
}

export interface NuiEditorToolbarGroupProps {
  group: ToolbarGroup;
  disabled?: boolean | undefined;
}

export interface NuiEditorColourMenuProps {
  colours: ToolbarColours;
  disabled?: boolean | undefined;
}

export type ColourMark = 'color' | 'highlight';

export interface NuiEditorToolbarButtonProps {
  action: ToolbarFace;
  disabled?: boolean | undefined;
}

export interface NuiEditorBlockMenuProps {
  blocks: ToolbarBlocks;
  disabled?: boolean | undefined;
}
