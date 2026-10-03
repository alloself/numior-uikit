import type { Attrs, ContentNode, ElementNode, IdSource, Mark, TextNode } from './node.types';

const offsetCache = new WeakMap<ElementNode, readonly number[]>();

export const nodeSize = (node: ContentNode): number =>
  node.kind === 'text' ? node.text.length : node.size;

export const contentSize = (content: readonly ContentNode[]): number =>
  content.reduce((sum, node) => sum + nodeSize(node), 0);

export const typeOf = (node: ContentNode): string => (node.kind === 'text' ? 'text' : node.type);

const sameAttrs = (left: Attrs, right: Attrs): boolean => {
  const keys = Object.keys(left);

  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => Object.hasOwn(right, key) && left[key] === right[key])
  );
};

const sameMark = (left: Mark, right: Mark): boolean =>
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

export const childOffsets = (node: ElementNode): readonly number[] => {
  const cached = offsetCache.get(node);

  if (cached !== undefined) {
    return cached;
  }
  const offsets: number[] = [];
  let offset = 0;

  for (const child of node.content) {
    offsets.push(offset);
    offset += nodeSize(child);
  }
  offsetCache.set(node, offsets);
  return offsets;
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

export const createIdSource = (prefix = 'n'): IdSource => {
  let count = 0;

  return {
    next: () => {
      count += 1;
      return `${prefix}${count.toString(36)}`;
    },
  };
};
