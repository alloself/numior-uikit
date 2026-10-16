import type { Mappable } from '../transform/mapping.types';

export interface InlineDecoration {
  readonly from: number;
  readonly to: number;
  readonly class: string;
}

export interface DecorationSet {
  readonly decorations: readonly InlineDecoration[];
  map(mapping: Mappable): DecorationSet;
}
