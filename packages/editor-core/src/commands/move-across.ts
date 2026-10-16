import type { Doc } from '../doc/doc.types';
import { emptyTextblock } from '../doc/empty';
import { contentSize } from '../model/node';
import type { ContentNode, ElementNode, NodeId } from '../model/node.types';
import type { Schema } from '../schema/schema.types';
import { textSelection } from '../state/selection';
import type { Selection } from '../state/selection.types';
import type { Command, Transaction } from '../state/state.types';
import { childNode, isSlot, moveChild, type ChildSlot } from './move';

export interface BlockTarget {
  readonly parent: NodeId;
  readonly index: number;
}

type Path = readonly NodeId[];

const element = (schema: Schema, node: ElementNode, content: readonly ContentNode[]): ElementNode =>
  schema.element(node.type, { id: node.id, attrs: node.attrs, content });

const nodeOf = (doc: Doc, id: NodeId): ElementNode | undefined =>
  id === doc.root.id ? doc.root : doc.byId(id);

const pathTo = (doc: Doc, id: NodeId): Path | undefined => {
  if (id === doc.root.id) {
    return [id];
  }
  const pos = doc.positionOf(id);

  if (pos === undefined) {
    return undefined;
  }
  const $pos = doc.resolve(pos);
  const ids: NodeId[] = [];

  for (let depth = 0; depth <= $pos.depth; depth += 1) {
    ids.push($pos.node(depth).id);
  }
  return [...ids, id];
};

const childWith = (node: ElementNode, id: NodeId): number =>
  node.content.findIndex((child) => child.kind === 'element' && child.id === id);

const atPath = (tree: ElementNode, path: Path): ElementNode | undefined => {
  let current: ElementNode | undefined = tree;

  for (const id of path.slice(1)) {
    const child: ContentNode | undefined =
      current?.content[current === undefined ? -1 : childWith(current, id)];

    current = child?.kind === 'element' ? child : undefined;
  }
  return current;
};

const editAt = (
  schema: Schema,
  tree: ElementNode,
  path: Path,
  edit: (node: ElementNode) => readonly ContentNode[],
): ElementNode => {
  const [, next, ...rest] = path;

  if (next === undefined) {
    return element(schema, tree, edit(tree));
  }
  const index = childWith(tree, next);
  const child = tree.content[index];

  if (child?.kind !== 'element') {
    return tree;
  }
  const content = [...tree.content];

  content[index] = editAt(schema, child, [next, ...rest], edit);
  return element(schema, tree, content);
};

const fits = (schema: Schema, node: ElementNode, content: readonly ContentNode[]): boolean =>
  schema.nodes.get(node.type)?.content.matchContent(content)?.validEnd === true;

const isList = (schema: Schema, node: ElementNode): boolean =>
  schema.nodes.get(node.type)?.groups.has('list') === true;

const itemTypeOf = (schema: Schema, list: ElementNode): string | undefined =>
  [...(schema.nodes.get(list.type)?.content.next.keys() ?? [])][0];

const isItemOf = (schema: Schema, node: ElementNode): boolean =>
  [...schema.nodes.values()].some(
    (type) => type.groups.has('list') && type.content.next.has(node.type),
  );

const asTextblock = (schema: Schema, node: ElementNode): ElementNode | undefined => {
  const paragraph = emptyTextblock(schema, node.id);
  const type = schema.nodes.get(node.type);

  if (paragraph === undefined || type?.inlineContent !== true) {
    return undefined;
  }
  return node.type === paragraph.type
    ? node
    : schema.element(paragraph.type, {
        id: node.id,
        content: node.content.map((child) =>
          child.kind === 'text' && type.code ? schema.text(child.text) : child,
        ),
      });
};

const retyped = (schema: Schema, item: ElementNode, type: string): ElementNode =>
  item.type === type ? item : schema.element(type, { id: item.id, content: item.content });

interface Move {
  readonly tr: Transaction;
  readonly schema: Schema;
  readonly node: ElementNode;
  readonly source: ElementNode;
  readonly target: ElementNode;
}

const intoList = (move: Move): readonly ContentNode[] | undefined => {
  const { schema, node, target, tr } = move;
  const itemType = itemTypeOf(schema, target);

  if (itemType === undefined) {
    return undefined;
  }
  if (isList(schema, node)) {
    return node.content.flatMap((item) =>
      item.kind === 'element' ? [retyped(schema, item, itemType)] : [],
    );
  }
  if (isItemOf(schema, node)) {
    return [retyped(schema, node, itemType)];
  }
  const paragraph = asTextblock(schema, node);

  return paragraph === undefined
    ? undefined
    : [schema.element(itemType, { id: tr.newId(), content: [paragraph] })];
};

const converted = (move: Move): readonly ContentNode[] | undefined => {
  const { schema, node, source, target, tr } = move;

  if (isList(schema, target)) {
    return intoList(move);
  }
  if (isItemOf(schema, node) && isList(schema, source)) {
    return [schema.element(source.type, { id: tr.newId(), content: [node] })];
  }
  return [node];
};

const tidied = (schema: Schema, node: ElementNode, tr: Transaction): readonly ContentNode[] => {
  const [only] = node.content;

  if (schema.nodes.get(node.type)?.slots === 'all' && node.content.length === 0) {
    return [];
  }
  if (node.content.length === 1 && only?.kind === 'element') {
    return only.content;
  }
  const filler = emptyTextblock(schema, tr.newId());

  return filler !== undefined && fits(schema, node, [filler])
    ? [element(schema, node, [filler])]
    : [];
};

const cleaned = (schema: Schema, tree: ElementNode, path: Path, tr: Transaction): ElementNode => {
  let current = tree;

  for (let depth = path.length - 1; depth >= 1; depth -= 1) {
    const node = atPath(current, path.slice(0, depth + 1));

    if (node === undefined || fits(schema, node, node.content)) {
      return current;
    }
    const replacement = tidied(schema, node, tr);
    const id = node.id;

    current = editAt(schema, current, path.slice(0, depth), (parent) =>
      parent.content.flatMap((child) =>
        child.kind === 'element' && child.id === id ? replacement : [child],
      ),
    );
  }
  const filler = emptyTextblock(schema, tr.newId());

  return current.content.length === 0 && filler !== undefined
    ? element(schema, current, [filler])
    : current;
};

const merged = (
  schema: Schema,
  left: ContentNode | undefined,
  right: ContentNode | undefined,
): ElementNode | undefined =>
  left?.kind === 'element' &&
  right?.kind === 'element' &&
  left.type === right.type &&
  isList(schema, left)
    ? element(schema, left, [...left.content, ...right.content])
    : undefined;

const spliced = (
  schema: Schema,
  content: readonly ContentNode[],
  index: number,
  inserted: readonly ContentNode[],
): readonly ContentNode[] => {
  const before = content.slice(0, index);
  const after = content.slice(index);
  const middle = [...inserted];
  const head = merged(schema, before.at(-1), middle[0]);

  if (head !== undefined) {
    before.pop();
    middle[0] = head;
  }
  const tail = merged(schema, middle.at(-1), after[0]);

  if (tail !== undefined) {
    after.shift();
    middle[middle.length - 1] = tail;
  }
  return [...before, ...middle, ...after];
};

interface Anchor {
  readonly before: NodeId | undefined;
  readonly after: NodeId | undefined;
}

const idAt = (node: ElementNode, index: number): NodeId | undefined => {
  const child = node.content[index];

  return child?.kind === 'element' ? child.id : undefined;
};

const anchoredIndex = (node: ElementNode, anchor: Anchor): number => {
  const after = anchor.after === undefined ? -1 : childWith(node, anchor.after);
  const before = anchor.before === undefined ? -1 : childWith(node, anchor.before);

  if (after >= 0) {
    return after;
  }
  return before >= 0 || anchor.before === undefined ? before + 1 : node.content.length;
};

const commonDepth = (left: Path, right: Path): number => {
  let depth = 0;

  while (left[depth + 1] !== undefined && left[depth + 1] === right[depth + 1]) {
    depth += 1;
  }
  return depth;
};

const sharedEnds = (
  before: readonly ContentNode[],
  after: readonly ContentNode[],
): readonly [number, number] => {
  let start = 0;
  let end = 0;

  while (start < before.length && start < after.length && before[start] === after[start]) {
    start += 1;
  }
  while (
    end < before.length - start &&
    end < after.length - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  ) {
    end += 1;
  }
  return [start, end];
};

const replaceWithin = (
  doc: Doc,
  tr: Transaction,
  before: ElementNode,
  after: ElementNode,
): boolean => {
  const [start, end] = sharedEnds(before.content, after.content);
  const base = before.id === doc.root.id ? 0 : (doc.positionOf(before.id) ?? -1) + 1;
  const from = base + contentSize(before.content.slice(0, start));
  const to = from + contentSize(before.content.slice(start, before.content.length - end));

  return (
    base >= 0 &&
    tr.maybeStep({
      kind: 'replace',
      from,
      to,
      slice: {
        content: after.content.slice(start, after.content.length - end),
        openStart: 0,
        openEnd: 0,
      },
    }).ok
  );
};

const inside = (doc: Doc, node: ElementNode, id: NodeId): boolean =>
  (pathTo(doc, id) ?? []).includes(node.id);

const follow = (tr: Transaction, before: Doc, node: ElementNode, selection: Selection): void => {
  const start = before.positionOf(node.id) ?? 0;
  const moved = tr.doc.positionOf(node.id);

  if (
    selection.kind === 'text' &&
    moved !== undefined &&
    selection.head > start &&
    selection.head < start + node.size
  ) {
    tr.setSelection(
      textSelection(selection.anchor - start + moved, selection.head - start + moved),
    );
  }
};

interface Plan {
  readonly node: ElementNode;
  readonly source: ElementNode;
  readonly target: ElementNode;
  readonly sourcePath: Path;
  readonly targetPath: Path;
}

const planOf = (doc: Doc, from: ChildSlot, to: BlockTarget): Plan | undefined => {
  const node = childNode(doc, from);
  const source = nodeOf(doc, from.parent);
  const target = nodeOf(doc, to.parent);
  const sourcePath = pathTo(doc, from.parent);
  const targetPath = pathTo(doc, to.parent);

  return node === undefined ||
    source === undefined ||
    target === undefined ||
    sourcePath === undefined ||
    targetPath === undefined ||
    inside(doc, node, to.parent) ||
    !isSlot(doc, target, to.index)
    ? undefined
    : { node, source, target, sourcePath, targetPath };
};

const rebuilt = (
  doc: Doc,
  tr: Transaction,
  plan: Plan,
  to: BlockTarget,
): ElementNode | undefined => {
  const { schema } = doc;
  const { node, source, target, sourcePath, targetPath } = plan;
  const inserted = converted({ tr, schema, node, source, target });
  const anchor = { before: idAt(target, to.index - 1), after: idAt(target, to.index) };

  const taken = editAt(schema, doc.root, sourcePath, (parent) =>
    parent.content.filter((child) => child.kind !== 'element' || child.id !== node.id),
  );

  const tidy = cleaned(schema, taken, sourcePath, tr);
  const place = atPath(tidy, targetPath);

  if (inserted === undefined || place === undefined) {
    return undefined;
  }
  const content = spliced(schema, place.content, anchoredIndex(place, anchor), inserted);

  return fits(schema, place, content) ? editAt(schema, tidy, targetPath, () => content) : undefined;
};

export const moveBlock =
  (from: ChildSlot, to: BlockTarget): Command =>
  (state, dispatch) => {
    const { doc } = state;

    if (from.parent === to.parent) {
      return moveChild(
        from.parent,
        from.index,
        to.index > from.index ? to.index - 1 : to.index,
      )(state, dispatch);
    }
    const plan = planOf(doc, from, to);
    const tr = state.tr;
    const tree = plan === undefined ? undefined : rebuilt(doc, tr, plan, to);
    const common = plan?.sourcePath.slice(0, commonDepth(plan.sourcePath, plan.targetPath) + 1);
    const before = common === undefined ? undefined : atPath(doc.root, common);
    const after = common === undefined || tree === undefined ? undefined : atPath(tree, common);

    if (
      plan === undefined ||
      before === undefined ||
      after === undefined ||
      !replaceWithin(doc, tr, before, after)
    ) {
      return false;
    }
    follow(tr, doc, plan.node, state.selection);
    dispatch?.(tr);
    return true;
  };
