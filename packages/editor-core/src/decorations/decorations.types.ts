import type { NodeId } from '../model/node.types';
import type { Mappable } from '../transform/mapping.types';

export interface InlineDecoration {
  readonly from: number;
  readonly to: number;
  readonly class: string;
}

export interface BlockDecoration {
  readonly block: NodeId;
  readonly from: number;
  readonly to: number;
  readonly class: string;
}

export interface DecorationSet {
  readonly decorations: readonly InlineDecoration[];
  readonly blocks: readonly BlockDecoration[];
  map(mapping: Mappable): DecorationSet;
}
