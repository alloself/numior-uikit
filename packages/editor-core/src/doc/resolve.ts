import { childIndexAt, childOffsets } from '../model/node';
import { ContentNodeKind, type ContentNode, type ElementNode } from '../model/node.types';
import type { ResolvedPos } from './doc.types';

interface Level {
  readonly node: ElementNode;
  readonly start: number;
  readonly index: number;
}

interface ChildPlace {
  readonly index: number;
  readonly child: ContentNode | undefined;
  readonly childStart: number;
}

const levelAt = (levels: readonly Level[], depth: number): Level => {
  const level = levels[depth];

  if (level === undefined) {
    throw new RangeError(`Depth ${depth} is outside the resolved position`);
  }
  return level;
};

const neighbours = (
  parent: ElementNode,
  index: number,
  textOffset: number,
): readonly [ContentNode | undefined, ContentNode | undefined] => {
  const child = parent.content[index];

  if (child?.kind === ContentNodeKind.Text && textOffset > 0) {
    return [
      { ...child, text: child.text.slice(0, textOffset) },
      { ...child, text: child.text.slice(textOffset) },
    ];
  }
  return [parent.content[index - 1], child];
};

const placeIn = (node: ElementNode, start: number, pos: number): ChildPlace => {
  const index = childIndexAt(node, pos - start);

  return {
    index,
    child: node.content[index],
    childStart: start + (childOffsets(node)[index] ?? 0),
  };
};

const descend = (root: ElementNode, pos: number): { levels: Level[]; textOffset: number } => {
  let place = placeIn(root, 0, pos);
  const levels: Level[] = [{ node: root, start: 0, index: place.index }];

  while (place.child?.kind === ContentNodeKind.Element && place.childStart !== pos) {
    const node = place.child;
    const start = place.childStart + 1;

    place = placeIn(node, start, pos);
    levels.push({ node, start, index: place.index });
  }
  return {
    levels,
    textOffset: place.child?.kind === ContentNodeKind.Text ? pos - place.childStart : 0,
  };
};

export const resolveIn = (root: ElementNode, size: number, pos: number): ResolvedPos => {
  if (!Number.isInteger(pos) || pos < 0 || pos > size) {
    throw new RangeError(`Position ${pos} is outside the document of size ${size}`);
  }
  const { levels, textOffset } = descend(root, pos);
  const depth = levels.length - 1;
  const last = levelAt(levels, depth);
  const [nodeBefore, nodeAfter] = neighbours(last.node, last.index, textOffset);
  const start = (level: number): number => levelAt(levels, level).start;
  const end = (level: number): number => start(level) + levelAt(levels, level).node.size - 2;

  return {
    pos,
    depth,
    parent: last.node,
    parentOffset: pos - last.start,
    index: last.index,
    textOffset,
    nodeBefore,
    nodeAfter,
    node: (level) => levelAt(levels, level).node,
    indexAt: (level) => levelAt(levels, level).index,
    start,
    end,
    before: (level) => start(level) - 1,
    after: (level) => end(level) + 1,
  };
};

export const sharedDepth = (left: ResolvedPos, right: ResolvedPos): number => {
  let depth = 0;

  while (
    depth < Math.min(left.depth, right.depth) &&
    left.node(depth + 1) === right.node(depth + 1)
  ) {
    depth += 1;
  }
  return depth;
};
