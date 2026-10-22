import { childIndexAt, childOffsets, nodeSize, withContent } from '../model/node';
import type { ContentNode, ElementNode, NodeId } from '../model/node.types';
import type { Schema } from '../schema/schema.types';
import type { Doc, NodeVisitor, Slice } from './doc.types';
import { resolveIn, sharedDepth } from './resolve';

interface Placed {
  readonly node: ElementNode;
  readonly pos: number;
}

const indexTree = (root: ElementNode): Map<NodeId, Placed> => {
  const index = new Map<NodeId, Placed>();

  const walk = (node: ElementNode, start: number): void => {
    const offsets = childOffsets(node);

    node.content.forEach((child, position) => {
      if (child.kind === 'element') {
        const pos = start + (offsets[position] ?? 0);

        index.set(child.id, { node: child, pos });
        walk(child, pos + 1);
      }
    });
  };

  walk(root, 0);
  return index;
};

const visitRange = (
  node: ElementNode,
  start: number,
  from: number,
  to: number,
  visit: NodeVisitor,
): void => {
  const offsets = childOffsets(node);
  const startOf = (index: number): number => start + (offsets[index] ?? 0);

  for (
    let index = childIndexAt(node, Math.max(0, from - start));
    index < node.content.length && startOf(index) < to;
    index += 1
  ) {
    const child = node.content[index];

    if (
      child !== undefined &&
      visit(child, startOf(index), node, index) &&
      child.kind === 'element'
    ) {
      visitRange(child, startOf(index) + 1, from, to, visit);
    }
  }
};

const cutChild = (
  child: ContentNode,
  childStart: number,
  from: number,
  to: number,
): ContentNode[] => {
  const childEnd = childStart + nodeSize(child);

  if (childEnd <= from || childStart >= to) {
    return [];
  }
  if (child.kind === 'text') {
    const text = child.text.slice(Math.max(from, childStart) - childStart, to - childStart);

    return text === '' ? [] : [{ ...child, text }];
  }
  if (childStart >= from && childEnd <= to) {
    return [child];
  }
  return [withContent(child, cutContent(child, childStart + 1, from, to))];
};

const cutContent = (node: ElementNode, start: number, from: number, to: number): ContentNode[] => {
  const offsets = childOffsets(node);
  const startOf = (index: number): number => start + (offsets[index] ?? 0);
  const cut: ContentNode[] = [];

  for (
    let index = childIndexAt(node, Math.max(0, from - start));
    index < node.content.length && startOf(index) < to;
    index += 1
  ) {
    const child = node.content[index];

    if (child !== undefined) {
      cut.push(...cutChild(child, startOf(index), from, to));
    }
  }
  return cut;
};

export const createDoc = (schema: Schema, root: ElementNode): Doc => {
  if (root.type !== schema.top.name) {
    throw new RangeError(`A document needs a "${schema.top.name}" root, not "${root.type}"`);
  }
  const size = root.size - 2;
  let index: Map<NodeId, Placed> | undefined;
  const placed = (id: NodeId): Placed | undefined => (index ??= indexTree(root)).get(id);

  const doc: Doc = {
    schema,
    root,
    size,
    byId: (id) => (id === root.id ? root : placed(id)?.node),
    positionOf: (id) => placed(id)?.pos,
    resolve: (pos) => resolveIn(root, size, pos),
    nodeAt: (pos) => resolveIn(root, size, pos).nodeAfter,
    nodesBetween: (from, to, visit) => {
      visitRange(root, 0, from, to, visit);
    },
    textBetween: (from, to, separator = '\n') => {
      let text = '';
      let pending = false;

      visitRange(root, 0, from, to, (node, pos) => {
        if (node.kind === 'element') {
          pending ||= text !== '' && schema.nodes.get(node.type)?.inline !== true;
          return true;
        }
        text += `${pending ? separator : ''}${node.text.slice(Math.max(from, pos) - pos, to - pos)}`;
        pending = false;
        return true;
      });

      return text;
    },
    slice: (from, to): Slice => {
      if (from > to) {
        throw new RangeError(`A slice cannot run backwards from ${from} to ${to}`);
      }
      const left = doc.resolve(from);
      const right = doc.resolve(to);
      const depth = sharedDepth(left, right);

      return {
        content: cutContent(left.node(depth), left.start(depth), from, to),
        openStart: left.depth - depth,
        openEnd: right.depth - depth,
      };
    },
  };

  return doc;
};
