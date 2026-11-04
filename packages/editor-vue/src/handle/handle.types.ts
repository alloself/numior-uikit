import type { ChildSlot, EditorState, ElementNode } from '@numior/editor-core';
import type { NuiMenuEntry } from '@numior/vue';

export type DropEdge = (typeof DropEdge)[keyof typeof DropEdge];

export interface NuiEditorBlockHandleProps {
  state: EditorState;
  target: ChildSlot | undefined;
  dragging: boolean;
  blockMenu: (node: ElementNode) => NuiMenuEntry[];
}

export const DropEdge = { Top: 'top', Bottom: 'bottom' } as const;

export const DropTargetKind = { Between: 'between', Beside: 'beside' } as const;
