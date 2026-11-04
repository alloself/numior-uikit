import type { NodeId } from '../model/node.types';
import { type SelectionKind } from './state.types';

export type GapSide = (typeof GapSide)[keyof typeof GapSide];

export interface CellRef {
  readonly row: number;
  readonly col: number;
}

export type Selection =
  | { readonly kind: typeof SelectionKind.Text; readonly anchor: number; readonly head: number }
  | { readonly kind: typeof SelectionKind.Node; readonly id: NodeId }
  | { readonly kind: typeof SelectionKind.Gap; readonly id: NodeId; readonly side: GapSide }
  | {
      readonly kind: typeof SelectionKind.Block;
      readonly anchorId: NodeId;
      readonly headId: NodeId;
    }
  | {
      readonly kind: typeof SelectionKind.Cell;
      readonly tableId: NodeId;
      readonly anchor: CellRef;
      readonly head: CellRef;
    }
  | { readonly kind: typeof SelectionKind.All };

export interface SelectionRange {
  readonly from: number;
  readonly to: number;
}

export const GapSide = { Start: 'start', End: 'end' } as const;
