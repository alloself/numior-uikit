import type { Mappable } from '../transform/mapping.types';
import type { NodeId } from '../model/node.types';
import type {
  BlockDecoration,
  BlockDecorationGroups,
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

const groupsOf = (blocks: readonly BlockDecoration[]): BlockDecorationGroups =>
  blocks.reduce((groups, decoration) => {
    if (visible(decoration)) {
      groups.set(decoration.block, [...(groups.get(decoration.block) ?? []), decoration]);
    }
    return groups;
  }, new Map<NodeId, BlockDecoration[]>());

const keptGroups = (groups: BlockDecorationGroups): BlockDecorationGroups =>
  [...groups].reduce((kept, [block, group]) => {
    const shown = group.every(visible) ? group : group.filter(visible);

    if (shown.length > 0) {
      kept.set(block, shown);
    }
    return kept;
  }, new Map<NodeId, readonly BlockDecoration[]>());

const withGroups = (
  decorations: readonly InlineDecoration[],
  groups: BlockDecorationGroups,
  widgets: readonly WidgetDecoration[],
): DecorationSet => {
  const sorted = decorations.filter(visible).toSorted(byStart);

  return {
    decorations: sorted,
    blocks: groups,
    widgets,
    map: (mapping) =>
      withGroups(
        sorted.map((decoration) => mapped(decoration, mapping)),
        groups,
        widgets.map((widget) => ({ ...widget, pos: mapping.map(widget.pos, 1) })),
      ),
  };
};

export const decorationSet = (
  decorations: readonly InlineDecoration[],
  blocks: readonly BlockDecoration[] = [],
  widgets: readonly WidgetDecoration[] = [],
): DecorationSet => withGroups(decorations, groupsOf(blocks), widgets);

export const blockDecorationSet = (groups: BlockDecorationGroups): DecorationSet =>
  withGroups([], keptGroups(groups), []);

export const emptyDecorations: DecorationSet = decorationSet([]);
