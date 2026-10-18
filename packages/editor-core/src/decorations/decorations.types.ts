import type { NodeId } from '../model/node.types';
import type { Mappable } from '../transform/mapping.types';

export type DecorationTag = 'span' | 'mark';

export interface InlineDecoration {
  readonly from: number;
  readonly to: number;
  readonly class: string;
  readonly tag: DecorationTag;
}

export interface BlockDecoration {
  readonly block: NodeId;
  readonly from: number;
  readonly to: number;
  readonly class: string;
  readonly tag: DecorationTag;
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
