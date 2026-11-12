import { childIndexAt, childOffsets, nodeSize, withContent } from '../model/node';
import {
  ContentNodeKind,
  type ContentNode,
  type ElementNode,
  type NodeId,
} from '../model/node.types';
import type { Schema } from '../schema/schema.types';
import type { StepMap } from '../transform/mapping.types';
import type { Doc, NodeVisitor, Slice } from './doc.types';
import { resolveIn, sharedDepth } from './resolve';

interface Placed {
  readonly node: ElementNode;
  readonly pos: number;
}

interface Traced {
  readonly placed: Placed | undefined;
}

interface Line {
  depth: number;
}

export interface DocLineage {
  readonly doc: Doc;
  readonly map: StepMap;
}

const LINEAGE_LIMIT = 64;

const lines = new WeakMap<Doc, Line>();

const indexInto = (index: Map<NodeId, Placed>, node: ElementNode, start: number): void => {
  let pos = start;

  for (const child of node.content) {
    if (child.kind === ContentNodeKind.Element) {
      index.set(child.id, { node: child, pos });
      indexInto(index, child, pos + 1);
    }
    pos += nodeSize(child);
  }
};

const indexTree = (root: ElementNode): Map<NodeId, Placed> => {
  const index = new Map<NodeId, Placed>();

  indexInto(index, root, 0);
  return index;
};

const visitRange = (
  node: ElementNode,
  start: number,
  from: number,
  to: number,
  visit: NodeVisitor,
): void => {
  const { content } = node;
  let index = from <= start ? 0 : childIndexAt(node, from - start);
  let childStart = index === 0 ? start : start + (childOffsets(node)[index] ?? 0);

  while (index < content.length && childStart < to) {
    const child = content[index];

    if (child === undefined) {
      return;
    }
    if (visit(child, childStart, node, index) && child.kind === ContentNodeKind.Element) {
      visitRange(child, childStart + 1, from, to, visit);
    }
    index += 1;
    childStart += nodeSize(child);
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
  if (child.kind === ContentNodeKind.Text) {
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
  const { content } = node;
  const cut: ContentNode[] = [];
  let index = childIndexAt(node, Math.max(0, from - start));
  let childStart = start + (offsets[index] ?? 0);

  while (index < content.length && childStart < to) {
    const child = content[index];

    if (child !== undefined) {
      for (const entry of cutChild(child, childStart, from, to)) {
        cut.push(entry);
      }
    }
    index += 1;
    childStart = start + (offsets[index] ?? 0);
  }
  return cut;
};

const insertedIn = (root: ElementNode, map: StepMap, id: NodeId): Placed | undefined => {
  let shift = 0;
  let found: Placed | undefined;

  const visit: NodeVisitor = (node, pos) => {
    if (found !== undefined || node.kind !== ContentNodeKind.Element) {
      return false;
    }
    if (node.id !== id) {
      return true;
    }

    found = { node, pos };
    return false;
  };

  for (const range of map.ranges) {
    const from = range.start + shift;

    shift += range.newSize - range.oldSize;

    if (range.newSize === 0) {
      continue;
    }

    visitRange(root, 0, from, from + range.newSize, visit);

    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
};

const traceIn = (
  root: ElementNode,
  size: number,
  lineage: DocLineage,
  id: NodeId,
): Traced | undefined => {
  const before = lineage.doc.positionOf(id);

  if (before !== undefined) {
    const mapped = lineage.map.mapResult(before, 1);

    if (mapped.pos < 0 || mapped.pos > size) {
      return undefined;
    }

    const node = resolveIn(root, size, mapped.pos).nodeAfter;

    if (node?.kind === ContentNodeKind.Element && node.id === id) {
      return { placed: { node, pos: mapped.pos } };
    }
    if (!mapped.deletedAfter) {
      return undefined;
    }
  }
  return { placed: insertedIn(root, lineage.map, id) };
};

const lineOf = (lineage: DocLineage | undefined): Line => ({
  depth: lineage === undefined ? 0 : (lines.get(lineage.doc)?.depth ?? 0) + 1,
});

export const createDoc = (schema: Schema, root: ElementNode, lineage?: DocLineage): Doc => {
  if (root.type !== schema.top.name) {
    throw new RangeError(`A document needs a "${schema.top.name}" root, not "${root.type}"`);
  }
  const size = root.size - 2;
  const line = lineOf(lineage);
  const known = new Map<NodeId, Traced>();
  let index: Map<NodeId, Placed> | undefined;
  let source = line.depth > LINEAGE_LIMIT ? undefined : lineage;

  const indexed = (): Map<NodeId, Placed> => {
    index ??= indexTree(root);
    source = undefined;
    line.depth = 0;
    known.clear();
    return index;
  };

  const placed = (id: NodeId): Placed | undefined => {
    if (index !== undefined || source === undefined) {
      return indexed().get(id);
    }

    const cached = known.get(id) ?? traceIn(root, size, source, id);

    if (cached === undefined) {
      return indexed().get(id);
    }

    known.set(id, cached);
    return cached.placed;
  };

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
        if (node.kind === ContentNodeKind.Element) {
          const type = schema.nodes.get(node.type);
          const own = type?.plainText?.(node);

          pending ||= text !== '' && type?.inline !== true;

          if (own === undefined) {
            return true;
          }

          if (own !== '') {
            text += `${pending ? separator : ''}${own}`;
            pending = false;
          }
          return false;
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

  lines.set(doc, line);
  return doc;
};
