import type { ResolvedPos } from '../doc/doc.types';
import { withContent } from '../model/node';
import type { AttrValue, ContentNode, ElementNode } from '../model/node.types';
import type { Schema } from '../schema/schema.types';
import { isCursor, textPosition, textSelection } from '../state/selection';
import type { Command, Dispatch, EditorState, Transaction } from '../state/state.types';
import { ancestorTypes, sequence } from './format';

type Attrs = Readonly<Record<string, AttrValue>>;

interface ItemSpot {
  readonly $pos: ResolvedPos;
  readonly depth: number;
}

const typeOf = (schema: Schema, node: ContentNode | undefined) =>
  node?.kind === 'element' ? schema.nodes.get(node.type) : undefined;

const isList = (schema: Schema, node: ContentNode | undefined): boolean =>
  typeOf(schema, node)?.groups.has('list') === true;

const isTextblock = (schema: Schema, node: ContentNode | undefined): boolean =>
  typeOf(schema, node)?.inlineContent === true;

const fits = (
  schema: Schema,
  parent: ElementNode,
  index: number,
  replacement: readonly ContentNode[],
): boolean => {
  const content = [
    ...parent.content.slice(0, index),
    ...replacement,
    ...parent.content.slice(index + 1),
  ];

  return schema.nodes.get(parent.type)?.content.matchContent(content)?.validEnd === true;
};

const attempt = (
  state: EditorState,
  dispatch: Dispatch | undefined,
  build: (tr: Transaction) => boolean,
): boolean => {
  const tr = state.tr;

  try {
    if (!build(tr)) {
      return false;
    }
  } catch (error) {
    if (error instanceof RangeError) {
      return false;
    }
    throw error;
  }
  dispatch?.(tr);
  return true;
};

const headOf = (state: EditorState): number | undefined =>
  state.selection.kind === 'text' ? state.selection.head : undefined;

const itemSpotAt = (schema: Schema, $pos: ResolvedPos): ItemSpot | undefined => {
  for (let depth = $pos.depth - 1; depth >= 1; depth -= 1) {
    if (isList(schema, $pos.node(depth - 1))) {
      return { $pos, depth };
    }
  }
  return undefined;
};

const itemSpot = (state: EditorState): ItemSpot | undefined => {
  const head = headOf(state);

  return head === undefined ? undefined : itemSpotAt(state.doc.schema, state.doc.resolve(head));
};

const firstItemOf = (schema: Schema, listType: string): string | undefined =>
  schema.nodes.get(listType)?.content.next.keys().next().value;

const defaultsOf = (schema: Schema, type: string): Attrs =>
  schema.element(type, { id: 'defaults' }).attrs;

export const wrapTextblock = (
  tr: Transaction,
  pos: number,
  types: readonly { readonly type: string; readonly attrs?: Attrs | undefined }[],
): boolean => {
  const { schema } = tr.doc;
  const $pos = tr.doc.resolve(pos);
  const textblock = $pos.parent;
  const parent = $pos.node($pos.depth - 1);

  const build = (inside: readonly ContentNode[]): readonly ContentNode[] =>
    types.reduceRight<readonly ContentNode[]>(
      (inner, entry) => [
        schema.element(entry.type, { id: tr.newId(), attrs: entry.attrs, content: inner }),
      ],
      inside,
    );

  const wrapper = build([textblock]);

  const nested = (node: ContentNode | undefined): boolean =>
    node?.kind !== 'element' ||
    node === textblock ||
    (schema.nodes.get(node.type)?.content.matchContent(node.content)?.validEnd === true &&
      node.content.every(nested));

  if (
    $pos.depth < 1 ||
    !fits(schema, parent, $pos.indexAt($pos.depth - 1), wrapper) ||
    !nested(wrapper[0])
  ) {
    return false;
  }
  const from = $pos.before($pos.depth);
  const to = $pos.after($pos.depth);

  tr.step({
    kind: 'replaceAround',
    from,
    to,
    gapFrom: from,
    gapTo: to,
    slice: { content: build([]), openStart: 0, openEnd: 0 },
    insert: types.length,
  });

  return true;
};

const joinSiblings = (tr: Transaction, pos: number): void => {
  const $pos = tr.doc.resolve(pos);
  const index = $pos.index;
  const node = $pos.parent.content[index];
  const before = $pos.parent.content[index - 1];
  const after = $pos.parent.content[index + 1];

  if (node?.kind !== 'element') {
    return;
  }
  if (after?.kind === 'element' && after.type === node.type) {
    tr.join(pos + node.size);
  }
  if (before?.kind === 'element' && before.type === node.type) {
    tr.join(pos);
  }
};

export const wrapInList = (
  tr: Transaction,
  pos: number,
  listType: string,
  attrs: Attrs = {},
  itemAttrs: Attrs = {},
): boolean => {
  const { schema } = tr.doc;
  const itemType = firstItemOf(schema, listType);
  const $pos = tr.doc.resolve(pos);
  const first = tr.steps.length;

  if (
    itemType === undefined ||
    $pos.depth < 1 ||
    ($pos.depth >= 2 && isList(schema, $pos.node($pos.depth - 2))) ||
    !wrapTextblock(tr, pos, [
      { type: listType, attrs },
      { type: itemType, attrs: itemAttrs },
    ])
  ) {
    return false;
  }
  joinSiblings(tr, tr.mapping.slice(first).map($pos.before($pos.depth), -1));
  return true;
};

export const retypeTextblock = (
  tr: Transaction,
  pos: number,
  type: string,
  attrs: Attrs = {},
): boolean => {
  const { schema } = tr.doc;
  const $pos = tr.doc.resolve(pos);
  const textblock = $pos.parent;
  const target = schema.element(type, { id: textblock.id, attrs });
  const allowed = schema.nodes.get(type);

  if (
    $pos.depth < 1 ||
    !isTextblock(schema, target) ||
    !fits(schema, $pos.node($pos.depth - 1), $pos.indexAt($pos.depth - 1), [target]) ||
    !textblock.content.every(
      (child) =>
        allowed?.content.matchType(child.kind === 'text' ? 'text' : child.type) !== undefined &&
        (child.kind !== 'text' || child.marks.every((mark) => allowed.marks.has(mark.type))),
    )
  ) {
    return false;
  }
  const from = $pos.before($pos.depth);
  const to = $pos.after($pos.depth);

  tr.step({
    kind: 'replaceAround',
    from,
    to,
    gapFrom: from + 1,
    gapTo: to - 1,
    slice: { content: [target], openStart: 0, openEnd: 0 },
    insert: 1,
  });

  return true;
};

const placeBefore = (tr: Transaction, pos: number, node: ElementNode): boolean => {
  const { schema } = tr.doc;
  const $pos = tr.doc.resolve(pos);

  if (
    $pos.depth < 1 ||
    !fits(schema, $pos.node($pos.depth - 1), $pos.indexAt($pos.depth - 1), [node, $pos.parent])
  ) {
    return false;
  }
  tr.insert($pos.before($pos.depth), [node]);
  return true;
};

export const insertBeforeTextblock = (tr: Transaction, pos: number, type: string): boolean =>
  tr.doc.schema.nodes.has(type) &&
  placeBefore(tr, pos, tr.doc.schema.element(type, { id: tr.newId() }));

const liftItem = (tr: Transaction, state: EditorState, spot: ItemSpot, head: number): boolean => {
  const { schema } = state.doc;
  const { $pos, depth } = spot;
  const list = $pos.node(depth - 1);
  const item = $pos.node(depth);
  const index = $pos.indexAt(depth - 1);
  const itemStart = $pos.before(depth);
  const listStart = $pos.before(depth - 1);
  const listEnd = $pos.after(depth - 1);
  const following = list.content.slice(index + 1);
  const nested = depth >= 3 && isList(schema, $pos.node(depth - 3));

  const tail =
    following.length === 0
      ? []
      : [schema.element(list.type, { id: tr.newId(), attrs: list.attrs, content: following })];

  const from = index === 0 ? listStart : itemStart;
  const removed = (index === 0 ? listEnd : listEnd - 1) - from;

  if (nested) {
    const at = $pos.after(depth - 2);

    tr.insert(at, [withContent(item, [...item.content, ...tail])]).delete(from, from + removed);
    tr.setSelection(textSelection(at - removed + head - itemStart));
    return true;
  }
  tr.insert(listEnd, [...item.content, ...tail]).delete(from, from + removed);
  tr.setSelection(textSelection(listEnd - removed + head - itemStart - 1));
  return true;
};

export const liftListItem: Command = (state, dispatch) => {
  const spot = itemSpot(state);
  const head = headOf(state);

  return (
    spot !== undefined &&
    head !== undefined &&
    attempt(state, dispatch, (tr) => liftItem(tr, state, spot, head))
  );
};

export const sinkListItem: Command = (state, dispatch) => {
  const spot = itemSpot(state);
  const head = headOf(state);

  if (spot === undefined || head === undefined) {
    return false;
  }
  const { $pos, depth } = spot;
  const list = $pos.node(depth - 1);
  const index = $pos.indexAt(depth - 1);
  const previous = list.content[index - 1];
  const item = $pos.node(depth);
  const itemStart = $pos.before(depth);

  if (previous?.kind !== 'element') {
    return false;
  }
  const last = previous.content.at(-1);
  const joins = last?.kind === 'element' && last.type === list.type;

  return attempt(state, dispatch, (tr) => {
    tr.delete(itemStart, $pos.after(depth));
    if (joins) {
      tr.insert(itemStart - 2, [item]).setSelection(textSelection(head - 2));
    } else {
      tr.insert(itemStart - 1, [
        state.doc.schema.element(list.type, { id: tr.newId(), content: [item] }),
      ]).setSelection(textSelection(head));
    }
    return true;
  });
};

const cursorSpot = (state: EditorState): ItemSpot | undefined => {
  const spot = itemSpot(state);

  return spot !== undefined &&
    state.selection.kind === 'text' &&
    isCursor(state.selection) &&
    spot.$pos.depth === spot.depth + 1 &&
    spot.$pos.indexAt(spot.depth) === 0
    ? spot
    : undefined;
};

export const splitListItem: Command = (state, dispatch) => {
  const spot = cursorSpot(state);

  if (spot === undefined) {
    return false;
  }
  if (spot.$pos.parent.content.length === 0) {
    return liftListItem(state, dispatch);
  }
  const { schema } = state.doc;
  const item = spot.$pos.node(spot.depth);
  const pos = spot.$pos.pos;
  const defaults = defaultsOf(schema, item.type);

  return attempt(state, dispatch, (tr) => {
    tr.split(pos, 2);
    if (JSON.stringify(defaults) !== JSON.stringify(item.attrs)) {
      tr.setNodeAttrs(pos + 2, defaults);
    }
    tr.setSelection(textSelection(pos + 4));
    return true;
  });
};

const liftsFrom = (schema: Schema, wrapper: ElementNode): boolean => {
  const type = schema.nodes.get(wrapper.type);

  return (
    type !== undefined &&
    type.groups.has('block') &&
    !type.groups.has('list') &&
    [...schema.nodes.values()]
      .filter((candidate) => candidate.groups.has('block'))
      .every((candidate) => type.content.matchType(candidate.name) !== undefined)
  );
};

const liftFromWrapper: Command = (state, dispatch) => {
  const head = headOf(state);
  const $pos = head === undefined ? undefined : state.doc.resolve(head);

  if ($pos === undefined || head === undefined || $pos.depth < 2) {
    return false;
  }
  const wrapper = $pos.node($pos.depth - 1);

  if ($pos.indexAt($pos.depth - 1) !== 0 || !liftsFrom(state.doc.schema, wrapper)) {
    return false;
  }
  const child = $pos.parent;
  const childStart = $pos.before($pos.depth);
  const wrapperStart = $pos.before($pos.depth - 1);
  const single = wrapper.content.length === 1;

  const from = (single ? wrapperStart : childStart) + child.size;
  const to = (single ? $pos.after($pos.depth - 1) : $pos.after($pos.depth)) + child.size;

  return attempt(state, dispatch, (tr) => {
    tr.insert(wrapperStart, [child]).delete(from, to);
    tr.setSelection(textSelection(wrapperStart + head - childStart));
    return true;
  });
};

export const liftAtStart: Command = (state, dispatch) => {
  const head = headOf(state);

  if (
    head === undefined ||
    state.selection.kind !== 'text' ||
    !isCursor(state.selection) ||
    state.doc.resolve(head).parentOffset !== 0
  ) {
    return false;
  }
  return cursorSpot(state) === undefined
    ? liftFromWrapper(state, dispatch)
    : liftListItem(state, dispatch);
};

const toggleWrap =
  (wrap: (tr: Transaction, pos: number) => boolean): Command =>
  (state, dispatch) => {
    const head = headOf(state);

    return head !== undefined && attempt(state, dispatch, (tr) => wrap(tr, head));
  };

export const turnIntoList = (listType: string, attrs: Attrs = {}): Command =>
  toggleWrap((tr, pos) => wrapInList(tr, pos, listType, attrs));

export const wrapInBlock = (type: string, attrs: Attrs = {}): Command =>
  toggleWrap((tr, pos) => wrapTextblock(tr, pos, [{ type, attrs }]));

const listTypeAt = (state: EditorState): string | undefined =>
  ancestorTypes(state).find((type) => state.doc.schema.nodes.get(type)?.groups.has('list'));

export const toggleList = (listType: string, attrs: Attrs = {}): Command => {
  const wrap = turnIntoList(listType, attrs);

  return (state, dispatch) => {
    const current = listTypeAt(state);

    if (current === listType) {
      return liftListItem(state, dispatch);
    }
    return current === undefined
      ? wrap(state, dispatch)
      : sequence(liftListItem, wrap)(state, dispatch);
  };
};

const unwrap = (tr: Transaction, $pos: ResolvedPos, depth: number): boolean => {
  const result = tr.maybeStep({
    kind: 'replaceAround',
    from: $pos.before(depth),
    to: $pos.after(depth),
    gapFrom: $pos.start(depth),
    gapTo: $pos.end(depth),
    slice: { content: [], openStart: 0, openEnd: 0 },
    insert: 0,
  });

  return result.ok;
};

export const toggleWrapper = (type: string, attrs: Attrs = {}): Command => {
  const wrap = wrapInBlock(type, attrs);

  return (state, dispatch) => {
    const head = headOf(state);
    const $pos = head === undefined ? undefined : state.doc.resolve(head);
    const depth = $pos === undefined ? -1 : ancestorDepth($pos, type);

    if ($pos === undefined || depth < 1) {
      return wrap(state, dispatch);
    }
    return attempt(state, dispatch, (tr) => unwrap(tr, $pos, depth));
  };
};

const ancestorDepth = ($pos: ResolvedPos, type: string): number => {
  for (let depth = $pos.depth; depth >= 1; depth -= 1) {
    if ($pos.node(depth).type === type) {
      return depth;
    }
  }
  return -1;
};

const followingTextblock = (schema: Schema, parent: ElementNode): string | undefined =>
  [...(schema.nodes.get(parent.type)?.content.next.keys() ?? [])].find((name) => {
    const type = schema.nodes.get(name);

    return (
      type?.inlineContent === true &&
      Object.values(type.attrs).every((attr) => attr.default !== undefined)
    );
  });

const caretInto = (tr: Transaction, start: number): void => {
  const caret = textPosition(tr.doc, start, 1);

  if (caret !== undefined) {
    tr.setSelection(textSelection(caret));
  }
};

export const insertBlock =
  (build: (tr: Transaction) => ElementNode): Command =>
  (state, dispatch) => {
    const head = headOf(state);
    const $pos = head === undefined ? undefined : state.doc.resolve(head);

    if ($pos === undefined || head === undefined || !isTextblock(state.doc.schema, $pos.parent)) {
      return false;
    }
    const before = $pos.before($pos.depth);

    if ($pos.parent.content.length === 0) {
      return attempt(state, dispatch, (tr) => {
        const placed = placeBefore(tr, head, build(tr));

        if (placed) {
          caretInto(tr, before);
        }
        return placed;
      });
    }
    const next = followingTextblock(state.doc.schema, $pos.node($pos.depth - 1));

    return attempt(state, dispatch, (tr) => {
      const at = $pos.after($pos.depth);

      if (next === undefined) {
        return false;
      }
      tr.insert(at, [build(tr), tr.doc.schema.element(next, { id: tr.newId() })]);
      caretInto(tr, at);
      return true;
    });
  };

export const insertLeaf = (type: string): Command =>
  insertBlock((tr) => tr.doc.schema.element(type, { id: tr.newId() }));

export const insertDivider = (type = 'divider'): Command => insertLeaf(type);
