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

export interface WidgetDecoration {
  readonly pos: number;
  readonly key: string;
}

export interface DecorationSet {
  readonly decorations: readonly InlineDecoration[];
  readonly blocks: readonly BlockDecoration[];
  readonly widgets: readonly WidgetDecoration[];
  map(mapping: Mappable): DecorationSet;
}
