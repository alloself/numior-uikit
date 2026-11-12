import type { NodeId } from '../model/node.types';
import type { Ghost } from './ghosts';

export type AnchorRange =
  | { readonly kind: typeof AnchorRangeKind.Text; readonly from: number; readonly to: number }
  | { readonly kind: typeof AnchorRangeKind.Node; readonly id: NodeId };

export interface Anchor {
  readonly id: string;
  readonly range: AnchorRange;
  readonly lost: boolean;
}

export interface AnchorsState {
  readonly anchors: ReadonlyMap<string, Anchor>;
  readonly active: string | undefined;
  readonly ghosts: readonly Ghost[];
  readonly cuts: number;
}

export type AnchorJSON =
  | {
      readonly kind: typeof AnchorRangeKind.Text;
      readonly fromId: NodeId;
      readonly fromOffset: number;
      readonly toId: NodeId;
      readonly toOffset: number;
    }
  | { readonly kind: typeof AnchorRangeKind.Node; readonly id: NodeId };

export type AnchorChange =
  | { readonly kind: typeof AnchorChangeKind.Set; readonly id: string; readonly range: AnchorRange }
  | { readonly kind: typeof AnchorChangeKind.Remove; readonly id: string }
  | { readonly kind: typeof AnchorChangeKind.Activate; readonly id: string | undefined };

export const AnchorRangeKind = { Text: 'text', Node: 'node' } as const;

export const AnchorChangeKind = { Set: 'set', Remove: 'remove', Activate: 'activate' } as const;
