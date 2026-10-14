import type { Command, EditorState, Schema } from '@numior/editor-core';
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
