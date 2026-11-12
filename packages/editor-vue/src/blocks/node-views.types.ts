import type { NodeId } from '@numior/editor-core';
import type { NuiEditorBlockHost } from './block.types';
import type { NodeViewEntry } from './node-views';

export interface NuiEditorNodeViewsProps {
  entries: ReadonlyMap<number, NodeViewEntry>;
  selected: NodeId | undefined;
  focused: boolean;
  editable: boolean;
  host: NuiEditorBlockHost;
}
