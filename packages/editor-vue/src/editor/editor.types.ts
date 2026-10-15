import type { Command, EditorState, PasteSource, Schema } from '@numior/editor-core';
import type { NuiFieldControlProps } from '@numior/vue';

export interface NuiEditorProps extends NuiFieldControlProps {
  schema?: Schema | undefined;
  placeholder?: string | undefined;
  autofocus?: boolean | undefined;
}

export interface NuiEditorApi {
  state(): EditorState | undefined;
  run(command: Command): boolean;
  focus(): void;
}

export interface NuiEditorPaste {
  readonly source: PasteSource;
}
