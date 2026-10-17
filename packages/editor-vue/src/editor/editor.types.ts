import type { Command, EditorState, PasteSource, Schema } from '@numior/editor-core';
import type { NuiHighlighter } from '@numior/primitives';
import type { NuiFieldControlProps } from '@numior/vue';
import type { NuiEditorBlock } from '../blocks/block.types';
import type { NuiEditorUploadAdapter } from '../uploads/uploads.types';

export interface NuiEditorProps extends NuiFieldControlProps {
  schema?: Schema | undefined;
  placeholder?: string | undefined;
  autofocus?: boolean | undefined;
  toolbar?: NuiEditorToolbarMode | undefined;
  colours?: readonly string[] | undefined;
  highlights?: readonly string[] | undefined;
  blockHandles?: boolean | undefined;
  blocks?: readonly NuiEditorBlock[] | undefined;
  highlighter?: NuiHighlighter | false | undefined;
  upload?: NuiEditorUploadAdapter | undefined;
  accept?: string | undefined;
  maxSize?: number | undefined;
}

export type NuiEditorToolbarMode = 'fixed' | 'bubble' | 'both' | 'none';

export interface NuiEditorApi {
  state(): EditorState | undefined;
  run(command: Command): boolean;
  focus(): void;
}

export interface NuiEditorPaste {
  readonly source: PasteSource;
}
