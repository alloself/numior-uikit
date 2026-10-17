import type { Command, NodeId } from '@numior/editor-core';
import type { NodeViewEntry } from './node-views';

export interface NuiEditorNodeViewsProps {
  entries: ReadonlyMap<number, NodeViewEntry>;
  selected: NodeId | undefined;
  focused: boolean;
  editable: boolean;
  run: (command: Command) => boolean;
  focus: () => void;
}
