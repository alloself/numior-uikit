import type { Mappable } from '../transform/mapping.types';
import type { NodeId } from '../model/node.types';
import type { BlockDecoration, DecorationSet, InlineDecoration } from './decorations.types';

export const inlineDecoration = (
  from: number,
  to: number,
  className: string,
): InlineDecoration => ({
  from,
  to,
  class: className,
});

export const blockDecoration = (
  block: NodeId,
  from: number,
  to: number,
  className: string,
): BlockDecoration => ({ block, from, to, class: className });

const byStart = (left: InlineDecoration, right: InlineDecoration): number =>
  left.from - right.from || left.to - right.to;

const mapped = (decoration: InlineDecoration, mapping: Mappable): InlineDecoration => ({
  ...decoration,
  from: mapping.map(decoration.from, 1),
  to: mapping.map(decoration.to, -1),
});

const visible = (decoration: InlineDecoration): boolean =>
  decoration.to > decoration.from && decoration.class !== '';

export const decorationSet = (
  decorations: readonly InlineDecoration[],
  blocks: readonly BlockDecoration[] = [],
): DecorationSet => {
  const sorted = decorations.filter(visible).toSorted(byStart);
  const kept = blocks.filter(visible);

  return {
    decorations: sorted,
    blocks: kept,
    map: (mapping) =>
      decorationSet(
        sorted.map((decoration) => mapped(decoration, mapping)),
        kept,
      ),
  };
};

export const emptyDecorations: DecorationSet = decorationSet([]);
