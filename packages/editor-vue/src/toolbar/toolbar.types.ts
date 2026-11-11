import type { ElementCollection } from '@numior/primitives';
import type { EditorState } from '@numior/editor-core';
import type {
  ToolbarBlocks,
  ToolbarColours,
  ToolbarFace,
  ToolbarGroup,
  ToolbarInsert,
  ToolbarOptions,
} from './toolbar-items';
import type { SlashItem } from '../slash/slash-items';
import { type NuiContentMarkType } from '@numior/content';

export interface NuiEditorToolbarProps {
  state: EditorState;
  options: ToolbarOptions;
  inserts?: readonly SlashItem[] | undefined;
  disabled?: boolean | undefined;
  controls?: string | undefined;
  docked?: boolean | undefined;
}

export interface NuiEditorInsertMenuProps {
  insert: ToolbarInsert;
  disabled?: boolean | undefined;
}

export interface NuiEditorToolbarGroupProps {
  group: ToolbarGroup;
  disabled?: boolean | undefined;
}

export interface NuiEditorColourMenuProps {
  colours: ToolbarColours;
  disabled?: boolean | undefined;
}

export type ColourMark = typeof NuiContentMarkType.Color | typeof NuiContentMarkType.Highlight;

export interface NuiEditorToolbarButtonProps {
  action: ToolbarFace;
  disabled?: boolean | undefined;
}

export interface NuiEditorBlockMenuProps {
  blocks: ToolbarBlocks;
  disabled?: boolean | undefined;
}

export interface ColourOption {
  readonly value: string;
  readonly label: string;
  readonly modifier: string | undefined;
}

export interface ToolbarHints {
  readonly controls: ElementCollection<symbol>;
  readonly register: (element: Element, face: () => ToolbarFace) => void;
  readonly release: (element: Element) => void;
  readonly faceOf: (element: HTMLElement | null) => ToolbarFace | undefined;
}

export interface NuiEditorToolbarHintsProps {
  anchor: HTMLElement | null;
  hints: ToolbarHints;
  disabled?: boolean | undefined;
}

export const ToolbarItemKind = {
  Action: 'action',
  Blocks: 'blocks',
  Link: 'link',
  Colours: 'colours',
  Insert: 'insert',
} as const;

export const ToolbarGroupKey = {
  History: 'history',
  Insert: 'insert',
  Blocks: 'blocks',
  Marks: 'marks',
  Selection: 'selection',
} as const;
