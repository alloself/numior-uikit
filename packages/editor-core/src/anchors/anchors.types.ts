import type { NodeId } from '../model/node.types';

export type AnchorRange =
  | { readonly kind: 'text'; readonly from: number; readonly to: number }
  | { readonly kind: 'node'; readonly id: NodeId };

export interface Anchor {
  readonly id: string;
  readonly range: AnchorRange;
  readonly lost: boolean;
}

export interface AnchorsState {
  readonly anchors: ReadonlyMap<string, Anchor>;
  readonly active: string | undefined;
}

export type AnchorJSON =
  | {
      readonly kind: 'text';
      readonly fromId: NodeId;
      readonly fromOffset: number;
      readonly toId: NodeId;
      readonly toOffset: number;
    }
  | { readonly kind: 'node'; readonly id: NodeId };

export type AnchorChange =
  | { readonly kind: 'set'; readonly id: string; readonly range: AnchorRange }
  | { readonly kind: 'remove'; readonly id: string }
  | { readonly kind: 'activate'; readonly id: string | undefined };
