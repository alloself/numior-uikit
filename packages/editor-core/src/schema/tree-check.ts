import { contentSize, nodeSize } from '../model/node';
import { ContentNodeKind, type ContentNode, type ElementNode } from '../model/node.types';
import { checkAttrs, checkText, checkTreeIn, createCheckContext } from './check';
import {
  NodeName,
  type DocCheck,
  type NodeType,
  type Schema,
  type TreeCheck,
} from './schema.types';

interface Checker {
  readonly schema: Schema;
  readonly clean: WeakSet<ElementNode>;
  readonly ids: Set<string>;
  readonly repeats: Map<string, number>;
  readonly touched: Set<string>;
}

interface Ends {
  readonly before: readonly ContentNode[];
  readonly after: readonly ContentNode[];
}

const FITS: DocCheck = { ok: true };

const typeOf = (checker: Checker, node: ElementNode): NodeType | undefined =>
  node.type === NodeName.Text ? undefined : checker.schema.nodes.get(node.type);

const count = (checker: Checker, id: string): void => {
  checker.touched.add(id);

  if (!checker.ids.has(id)) {
    checker.ids.add(id);
    return;
  }
  checker.repeats.set(id, (checker.repeats.get(id) ?? 1) + 1);
};

const uncount = (checker: Checker, id: string): void => {
  const times = checker.repeats.get(id);

  if (times === undefined) {
    checker.ids.delete(id);
    return;
  }
  if (times > 2) {
    checker.repeats.set(id, times - 1);
    return;
  }
  checker.repeats.delete(id);
};

const countAll = (checker: Checker, node: ElementNode): void => {
  count(checker, node.id);

  for (const child of node.content) {
    if (child.kind === ContentNodeKind.Text) {
      continue;
    }
    countAll(checker, child);
  }
};

const uncountAll = (checker: Checker, node: ElementNode): void => {
  uncount(checker, node.id);

  for (const child of node.content) {
    if (child.kind === ContentNodeKind.Text) {
      continue;
    }
    uncountAll(checker, child);
  }
};

const sizeOf = (content: readonly ContentNode[]): number =>
  content.reduce((size, node) => size + nodeSize(node), 0);

const textsFit = (checker: Checker, node: ElementNode, type: NodeType): boolean => {
  const context = createCheckContext(checker.schema);

  node.content.forEach((child, index) => {
    if (child.kind !== ContentNodeKind.Text) {
      return;
    }

    const previous = node.content[index - 1];

    checkText(
      context,
      index,
      child,
      type,
      previous?.kind === ContentNodeKind.Text ? previous : undefined,
    );
  });

  return context.issues.length === 0;
};

const ownFits = (checker: Checker, node: ElementNode, type: NodeType, size: number): boolean => {
  const context = createCheckContext(checker.schema);

  checkAttrs(context, [], type.attrs, node.attrs);

  return (
    context.issues.length === 0 &&
    node.leaf === type.leaf &&
    node.size === (type.leaf ? 1 : size + 2) &&
    !(type.leaf && node.content.length > 0)
  );
};

const contentFits = (node: ElementNode, type: NodeType): boolean =>
  type.content.matchContent(node.content)?.validEnd === true;

const fresh = (checker: Checker, node: ElementNode): boolean => {
  if (checker.clean.has(node)) {
    countAll(checker, node);
    return true;
  }

  const type = typeOf(checker, node);

  if (
    type === undefined ||
    node.id === '' ||
    !ownFits(checker, node, type, contentSize(node.content)) ||
    !contentFits(node, type) ||
    !textsFit(checker, node, type)
  ) {
    return false;
  }
  count(checker, node.id);

  const kids = node.content.every(
    (child) => child.kind === ContentNodeKind.Text || fresh(checker, child),
  );

  if (!kids) {
    return false;
  }
  checker.clean.add(node);
  return true;
};

const middleOf = (old: readonly ContentNode[], next: readonly ContentNode[]): Ends => {
  const limit = Math.min(old.length, next.length);
  let head = 0;
  let tail = 0;

  while (head < limit && old[head] === next[head]) {
    head += 1;
  }
  while (tail < limit - head && old[old.length - 1 - tail] === next[next.length - 1 - tail]) {
    tail += 1;
  }
  return {
    before: old.slice(head, old.length - tail),
    after: next.slice(head, next.length - tail),
  };
};

const typeName = (node: ContentNode): string =>
  node.kind === ContentNodeKind.Text ? NodeName.Text : node.type;

const sameTypes = ({ before, after }: Ends): boolean =>
  before.length === after.length &&
  before.every((node, index) => {
    const other = after[index];

    return other !== undefined && typeName(node) === typeName(other);
  });

const hasText = (nodes: readonly ContentNode[]): boolean =>
  nodes.some((node) => node.kind === ContentNodeKind.Text);

const textsStillFit = (checker: Checker, node: ElementNode, type: NodeType, ends: Ends): boolean =>
  !(type.inlineContent || hasText(ends.after)) || textsFit(checker, node, type);

const kidsChanged = (checker: Checker, { before, after }: Ends): boolean => {
  const left = new Map<string, ElementNode>();

  for (const node of before) {
    if (node.kind === ContentNodeKind.Text) {
      continue;
    }
    left.set(node.id, node);
  }

  const fit = after.every((node) => {
    if (node.kind === ContentNodeKind.Text) {
      return true;
    }

    const old = left.get(node.id);

    if (old === undefined || old.type !== node.type) {
      return fresh(checker, node);
    }
    left.delete(node.id);
    return changed(checker, old, node);
  });

  for (const node of left.values()) {
    uncountAll(checker, node);
  }
  return fit;
};

const changed = (checker: Checker, old: ElementNode, next: ElementNode): boolean => {
  if (old === next) {
    return true;
  }

  const type = typeOf(checker, next);
  const ends = middleOf(old.content, next.content);
  const size = old.size - 2 - sizeOf(ends.before) + sizeOf(ends.after);

  const fits =
    type !== undefined &&
    ownFits(checker, next, type, size) &&
    (sameTypes(ends) || contentFits(next, type)) &&
    textsStillFit(checker, next, type, ends) &&
    kidsChanged(checker, ends);

  if (!fits) {
    return false;
  }
  checker.clean.add(next);
  return true;
};

const unique = (checker: Checker): boolean => {
  for (const id of checker.touched) {
    if (checker.repeats.has(id)) {
      return false;
    }
  }
  return true;
};

export const createTreeCheck = (schema: Schema): TreeCheck => {
  const clean = new WeakSet<ElementNode>();
  const repeats = new Map<string, number>();
  let ids = new Set<string>();
  let last: ElementNode | undefined;

  const checkerOf = (): Checker => ({ schema, clean, ids, repeats, touched: new Set() });

  const full = (root: ElementNode): DocCheck => {
    const context = createCheckContext(schema);
    const result = checkTreeIn(context, root);

    repeats.clear();
    ids = result.ok ? context.ids : new Set();
    last = result.ok ? root : undefined;
    return result;
  };

  return (root) => {
    const previous = last;

    const fast =
      previous !== undefined &&
      root.type === schema.top.name &&
      root.id === previous.id &&
      root.type === previous.type;

    if (!fast) {
      return full(root);
    }

    const checker = checkerOf();

    if (!changed(checker, previous, root) || !unique(checker)) {
      return full(root);
    }
    last = root;
    return FITS;
  };
};
