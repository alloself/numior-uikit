import type { Mappable } from '../transform/mapping.types';
import type { DecorationSet, InlineDecoration } from './decorations.types';

export const inlineDecoration = (
  from: number,
  to: number,
  className: string,
): InlineDecoration => ({
  from,
  to,
  class: className,
});

const byStart = (left: InlineDecoration, right: InlineDecoration): number =>
  left.from - right.from || left.to - right.to;

const mapped = (decoration: InlineDecoration, mapping: Mappable): InlineDecoration => ({
  ...decoration,
  from: mapping.map(decoration.from, 1),
  to: mapping.map(decoration.to, -1),
});

export const decorationSet = (decorations: readonly InlineDecoration[]): DecorationSet => {
  const sorted = decorations
    .filter((decoration) => decoration.to > decoration.from && decoration.class !== '')
    .toSorted(byStart);

  return {
    decorations: sorted,
    map: (mapping) => decorationSet(sorted.map((decoration) => mapped(decoration, mapping))),
  };
};

export const emptyDecorations: DecorationSet = decorationSet([]);
