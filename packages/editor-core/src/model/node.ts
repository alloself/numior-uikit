import type {
  Attrs,
  ContentNode,
  ElementNode,
  IdSource,
  Mark,
  NodeId,
  TextNode,
} from './node.types';

interface SeededIds extends IdSource {
  reserve(id: NodeId): void;
}

interface OffsetShift {
  readonly base: readonly number[];
  readonly from: number;
  readonly to: number;
  readonly start: number;
  readonly middle: readonly ContentNode[];
  readonly delta: number;
}

const offsetCache = new WeakMap<ElementNode, readonly number[]>();

const offsetShifts = new WeakMap<ElementNode, OffsetShift>();

export const nodeSize = (node: ContentNode): number =>
  node.kind === 'text' ? node.text.length : node.size;

export const contentSize = (content: readonly ContentNode[]): number =>
  content.reduce((sum, node) => sum + nodeSize(node), 0);

export const typeOf = (node: ContentNode): string => (node.kind === 'text' ? 'text' : node.type);

export const sameAttrs = (left: Attrs, right: Attrs): boolean => {
  const keys = Object.keys(left);

  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => Object.hasOwn(right, key) && left[key] === right[key])
  );
};

export const sameMark = (left: Mark, right: Mark): boolean =>
  left.type === right.type && sameAttrs(left.attrs, right.attrs);

export const sameMarks = (left: readonly Mark[], right: readonly Mark[]): boolean =>
  left.length === right.length &&
  left.every((mark, index) => {
    const other = right[index];

    return other !== undefined && sameMark(mark, other);
  });

const mergeable = (last: ContentNode | undefined, node: TextNode): last is TextNode =>
  last?.kind === 'text' && sameMarks(last.marks, node.marks);

export const normalizeContent = (content: readonly ContentNode[]): ContentNode[] => {
  const result: ContentNode[] = [];

  for (const node of content) {
    if (node.kind === 'element') {
      result.push(node);
    } else if (node.text !== '') {
      const last = result.at(-1);

      if (mergeable(last, node)) {
        result[result.length - 1] = { ...last, text: last.text + node.text };
      } else {
        result.push(node);
      }
    }
  }
  return result;
};

export const withContent = (node: ElementNode, content: readonly ContentNode[]): ElementNode => {
  const normalized = normalizeContent(content);

  return { ...node, content: normalized, size: contentSize(normalized) + 2 };
};

const shiftedOffsets = ({ base, from, to, start, middle, delta }: OffsetShift): number[] => {
  const same = middle.length === to - from;
  const offsets = same ? base.slice() : base.slice(0, from);
  let offset = start;

  middle.forEach((child, index) => {
    offsets[from + index] = offset;
    offset += nodeSize(child);
  });

  if (!same) {
    return offsets.concat(base.slice(to).map((value) => value + delta));
  }
  for (let at = to; at < offsets.length; at += 1) {
    offsets[at] = (offsets[at] ?? 0) + delta;
  }
  return offsets;
};

const startOf = (node: ElementNode, known: readonly number[], index: number): number => {
  const last = node.content.at(-1);

  return index < known.length
    ? (known[index] ?? 0)
    : (known.at(-1) ?? 0) + (last === undefined ? 0 : nodeSize(last));
};

const shiftOffsets = (
  node: ElementNode,
  next: ElementNode,
  splice: Omit<OffsetShift, 'base' | 'start'>,
): void => {
  const known = offsetCache.get(node);

  if (known !== undefined) {
    offsetShifts.set(next, { ...splice, base: known, start: startOf(node, known, splice.from) });
  }
};

export const spliceContent = (
  node: ElementNode,
  first: number,
  last: number,
  replacement: readonly ContentNode[],
): ElementNode => {
  const from = Math.max(0, first - 1);
  const to = Math.min(node.content.length, last + 1);
  const removed = node.content.slice(from, to);

  const middle = normalizeContent([
    ...node.content.slice(from, first),
    ...replacement,
    ...node.content.slice(last, to),
  ]);

  const added = contentSize(middle);
  const delta = added - contentSize(removed);

  const next: ElementNode = {
    ...node,
    content: [...node.content.slice(0, from), ...middle, ...node.content.slice(to)],
    size: node.size + delta,
  };

  shiftOffsets(node, next, { from, to, middle, delta });
  return next;
};

const freshOffsets = (node: ElementNode): number[] => {
  const offsets: number[] = [];
  let offset = 0;

  for (const child of node.content) {
    offsets.push(offset);
    offset += nodeSize(child);
  }
  return offsets;
};

export const childOffsets = (node: ElementNode): readonly number[] => {
  const cached = offsetCache.get(node);

  if (cached !== undefined) {
    return cached;
  }

  const shift = offsetShifts.get(node);
  const offsets = shift === undefined ? freshOffsets(node) : shiftedOffsets(shift);

  offsetShifts.delete(node);
  offsetCache.set(node, offsets);
  return offsets;
};

export const inheritOffsets = (
  from: ElementNode,
  to: ElementNode,
  index: number,
  delta: number,
): void => {
  const known = offsetCache.get(from);
  const child = to.content[index];

  if (known === undefined || known.length !== to.content.length || child === undefined) {
    return;
  }
  if (delta === 0) {
    offsetCache.set(to, known);
  } else {
    shiftOffsets(from, to, { from: index, to: index + 1, middle: [child], delta });
  }
};

export const childIndexAt = (node: ElementNode, offset: number): number => {
  const offsets = childOffsets(node);
  let low = 0;
  let high = offsets.length - 1;
  let found = offsets.length;

  while (low <= high) {
    const middle = (low + high) >> 1;
    const start = offsets[middle] ?? 0;
    const child = node.content[middle];
    const end = start + (child === undefined ? 0 : nodeSize(child));

    if (offset < start) {
      high = middle - 1;
    } else if (offset >= end) {
      low = middle + 1;
    } else {
      found = middle;
      break;
    }
  }
  return found;
};

export const createIdSource = (prefix = 'n', after = 0): IdSource => {
  let count = after;

  return {
    next: () => {
      count += 1;
      return `${prefix}${count.toString(36)}`;
    },
  };
};

const ID_COUNT = /^[0-9a-z]+$/;

const countOf = (id: NodeId, prefix: string): number => {
  const rest = id.slice(prefix.length);

  return id.startsWith(prefix) && ID_COUNT.test(rest) ? Number.parseInt(rest, 36) : 0;
};

const highestCount = (root: ElementNode, prefix: string): number => {
  let highest = 0;
  const pending: ElementNode[] = [root];

  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    highest = Math.max(highest, countOf(node.id, prefix));
    for (const child of node.content) {
      if (child.kind === 'element') {
        pending.push(child);
      }
    }
  }
  return highest;
};

const seededSources = new WeakMap<IdSource, SeededIds>();

export const seededOf = (source: IdSource): SeededIds | undefined => seededSources.get(source);

export const idSourceAfter = (root: ElementNode, prefix = 'n'): SeededIds => {
  let count: number | undefined;
  let reserved = 0;

  const source: SeededIds = {
    next: () => {
      count = Math.max(count ?? highestCount(root, prefix), reserved) + 1;
      return `${prefix}${count.toString(36)}`;
    },
    reserve: (id) => {
      reserved = Math.max(reserved, countOf(id, prefix));
    },
  };

  seededSources.set(source, source);
  return source;
};
