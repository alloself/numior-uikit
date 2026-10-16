import type { Command, EditorState } from '@numior/editor-core';
import type { NodeViewEntry } from './node-views';

export interface NuiEditorNodeViewsProps {
  entries: ReadonlyMap<number, NodeViewEntry>;
  state: EditorState;
  editable: boolean;
  run: (command: Command) => boolean;
  focus: () => void;
}
