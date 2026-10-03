import type { NodeId } from '../model/node.types';

export interface CellRef {
  readonly row: number;
  readonly col: number;
}

export type Selection =
  | { readonly kind: 'text'; readonly anchor: number; readonly head: number }
  | { readonly kind: 'node'; readonly id: NodeId }
  | { readonly kind: 'block'; readonly anchorId: NodeId; readonly headId: NodeId }
  | {
      readonly kind: 'cell';
      readonly tableId: NodeId;
      readonly anchor: CellRef;
      readonly head: CellRef;
    }
  | { readonly kind: 'all' };

export interface SelectionRange {
  readonly from: number;
  readonly to: number;
}
