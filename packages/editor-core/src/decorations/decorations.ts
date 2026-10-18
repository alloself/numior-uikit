import type { Mappable } from '../transform/mapping.types';
import type { NodeId } from '../model/node.types';
import type {
  BlockDecoration,
  DecorationSet,
  DecorationTag,
  InlineDecoration,
  WidgetDecoration,
} from './decorations.types';

export const inlineDecoration = (
  from: number,
  to: number,
  className: string,
  tag: DecorationTag = 'span',
): InlineDecoration => ({
  from,
  to,
  class: className,
  tag,
});

export const blockDecoration = (
  block: NodeId,
  from: number,
  to: number,
  className: string,
  tag: DecorationTag = 'span',
): BlockDecoration => ({ block, from, to, class: className, tag });

export const widgetDecoration = (pos: number, key: string): WidgetDecoration => ({ pos, key });

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
  widgets: readonly WidgetDecoration[] = [],
): DecorationSet => {
  const sorted = decorations.filter(visible).toSorted(byStart);
  const kept = blocks.filter(visible);

  return {
    decorations: sorted,
    blocks: kept,
    widgets,
    map: (mapping) =>
      decorationSet(
        sorted.map((decoration) => mapped(decoration, mapping)),
        kept,
        widgets.map((widget) => ({ ...widget, pos: mapping.map(widget.pos, 1) })),
      ),
  };
};

export const emptyDecorations: DecorationSet = decorationSet([]);
