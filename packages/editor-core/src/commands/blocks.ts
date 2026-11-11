import type { Doc, ResolvedPos } from '../doc/doc.types';
import { emptyTextblock } from '../doc/empty';
import { nodeSize, withContent } from '../model/node';
import {
  ContentNodeKind,
  type AttrValue,
  type ContentNode,
  type ElementNode,
} from '../model/node.types';
import { matchesSplice } from '../schema/content-match';
import type { Schema } from '../schema/schema.types';
import { isCursor, textPosition, textSelection } from '../state/selection';
import {
  SelectionKind,
  type Command,
  type EditorState,
  type Transaction,
} from '../state/state.types';
import { attempt, probe } from './attempt';
import { ancestorTypes, sequence } from './format';
import { isBlockAtom } from './atoms';
import type { BlockMaker } from './commands.types';
import { gapIndexOf, gapSpot, insertAtGap } from './gap';

type Attrs = Readonly<Record<string, AttrValue>>;

type WrapTypes = readonly { readonly type: string; readonly attrs?: Attrs | undefined }[];

interface ItemSpot {
  readonly $pos: ResolvedPos;
  readonly depth: number;
}

interface LiftPlan {
  readonly nested: boolean;
  readonly list: ElementNode;
  readonly item: ElementNode;
  readonly head: readonly ContentNode[];
  readonly tail: readonly ContentNode[];
}

const typeOf = (schema: Schema, node: ContentNode | undefined) =>
  node?.kind === ContentNodeKind.Element ? schema.nodes.get(node.type) : undefined;

const isList = (schema: Schema, node: ContentNode | undefined): boolean =>
  typeOf(schema, node)?.groups.has('list') === true;

const isTextblock = (schema: Schema, node: ContentNode | undefined): boolean =>
  typeOf(schema, node)?.inlineContent === true;

const splices = (
  schema: Schema,
  parent: ElementNode,
  from: number,
  to: number,
  inserted: readonly ContentNode[],
): boolean => {
  const type = schema.nodes.get(parent.type);

  return type !== undefined && matchesSplice(type.content, parent, from, to, inserted);
};

const fits = (
  schema: Schema,
  parent: ElementNode,
  index: number,
  replacement: readonly ContentNode[],
): boolean => splices(schema, parent, index, index + 1, replacement);

const headOf = (state: EditorState): number | undefined =>
  state.selection.kind === SelectionKind.Text ? state.selection.head : undefined;

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

const wrapped = (
  schema: Schema,
  types: WrapTypes,
  inside: readonly ContentNode[],
  idOf: () => string,
): readonly ContentNode[] =>
  types.reduceRight<readonly ContentNode[]>(
    (inner, entry) => [
      schema.element(entry.type, { id: idOf(), attrs: entry.attrs, content: inner }),
    ],
    inside,
  );

const nestedValid = (
  schema: Schema,
  node: ContentNode | undefined,
  textblock: ElementNode,
): boolean =>
  node?.kind !== ContentNodeKind.Element ||
  node === textblock ||
  (schema.nodes.get(node.type)?.content.matchContent(node.content)?.validEnd === true &&
    node.content.every((child) => nestedValid(schema, child, textblock)));

const wrapFits = (doc: Doc, pos: number, types: WrapTypes, idOf: () => string): boolean => {
  const { schema } = doc;
  const $pos = doc.resolve(pos);
  const textblock = $pos.parent;
  const parent = $pos.node($pos.depth - 1);
  const wrapper = wrapped(schema, types, [textblock], idOf);

  return (
    $pos.depth >= 1 &&
    fits(schema, parent, $pos.indexAt($pos.depth - 1), wrapper) &&
    nestedValid(schema, wrapper[0], textblock)
  );
};

export const wrapTextblock = (tr: Transaction, pos: number, types: WrapTypes): boolean => {
  if (!wrapFits(tr.doc, pos, types, () => tr.newId())) {
    return false;
  }

  const $pos = tr.doc.resolve(pos);
  const from = $pos.before($pos.depth);
  const to = $pos.after($pos.depth);

  tr.step({
    kind: 'replaceAround',
    from,
    to,
    gapFrom: from,
    gapTo: to,
    slice: {
      content: wrapped(tr.doc.schema, types, [], () => tr.newId()),
      openStart: 0,
      openEnd: 0,
    },
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

  if (node?.kind !== ContentNodeKind.Element) {
    return;
  }
  if (after?.kind === ContentNodeKind.Element && after.type === node.type) {
    tr.join(pos + node.size);
  }
  if (before?.kind === ContentNodeKind.Element && before.type === node.type) {
    tr.join(pos);
  }
};

const listTypesAt = (
  doc: Doc,
  pos: number,
  listType: string,
  attrs: Attrs,
  itemAttrs: Attrs,
): WrapTypes | undefined => {
  const { schema } = doc;
  const itemType = firstItemOf(schema, listType);
  const $pos = doc.resolve(pos);

  return itemType === undefined ||
    $pos.depth < 1 ||
    ($pos.depth >= 2 && isList(schema, $pos.node($pos.depth - 2)))
    ? undefined
    : [
        { type: listType, attrs },
        { type: itemType, attrs: itemAttrs },
      ];
};

export const wrapInList = (
  tr: Transaction,
  pos: number,
  listType: string,
  attrs: Attrs = {},
  itemAttrs: Attrs = {},
): boolean => {
  const types = listTypesAt(tr.doc, pos, listType, attrs, itemAttrs);
  const $pos = tr.doc.resolve(pos);
  const first = tr.steps.length;

  if (types === undefined || !wrapTextblock(tr, pos, types)) {
    return false;
  }
  joinSiblings(tr, tr.mapping.slice(first).map($pos.before($pos.depth), -1));
  return true;
};

const PROBE_ID = 'probe';

const probeId = (): string => PROBE_ID;

const canWrapInList = (doc: Doc, pos: number, listType: string, attrs: Attrs): boolean => {
  const types = listTypesAt(doc, pos, listType, attrs, {});

  return types !== undefined && wrapFits(doc, pos, types, probeId);
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
        allowed?.content.matchType(child.kind === ContentNodeKind.Text ? 'text' : child.type) !==
          undefined &&
        (child.kind !== ContentNodeKind.Text ||
          child.marks.every((mark) => allowed.marks.has(mark.type))),
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

const shellOf = (schema: Schema, node: ElementNode, id: string = node.id): ElementNode =>
  schema.element(node.type, { id, attrs: node.attrs });

const liftOutOfList = (tr: Transaction, spot: ItemSpot): void => {
  const { schema } = tr.doc;
  const { $pos, depth } = spot;
  const list = $pos.node(depth - 1);
  const index = $pos.indexAt(depth - 1);
  const itemStart = $pos.before(depth);
  const itemEnd = $pos.after(depth);
  const first = index === 0;
  const last = index === list.content.length - 1;

  tr.step({
    kind: 'replaceAround',
    from: first ? itemStart - 1 : itemStart,
    to: last ? itemEnd + 1 : itemEnd,
    gapFrom: itemStart + 1,
    gapTo: itemEnd - 1,
    slice: {
      content: [
        ...(first ? [] : [shellOf(schema, list)]),
        ...(last ? [] : [shellOf(schema, list, tr.newId())]),
      ],
      openStart: first ? 0 : 1,
      openEnd: last ? 0 : 1,
    },
    insert: first ? 0 : 1,
  });
};

const tuckFollowing = (tr: Transaction, spot: ItemSpot): number => {
  const { schema } = tr.doc;
  const { $pos, depth } = spot;
  const list = $pos.node(depth - 1);
  const itemEnd = $pos.after(depth);
  const listEnd = $pos.after(depth - 1);

  if ($pos.indexAt(depth - 1) === list.content.length - 1) {
    return 0;
  }

  tr.step({
    kind: 'replaceAround',
    from: itemEnd - 1,
    to: listEnd - 1,
    gapFrom: itemEnd,
    gapTo: listEnd - 1,
    slice: {
      content: [
        withContent(shellOf(schema, $pos.node(depth)), [shellOf(schema, list, tr.newId())]),
      ],
      openStart: 1,
      openEnd: 0,
    },
    insert: 1,
  });

  return 2;
};

const liftToOuterList = (tr: Transaction, spot: ItemSpot): void => {
  const { schema } = tr.doc;
  const { $pos, depth } = spot;
  const list = $pos.node(depth - 1);
  const parentItem = $pos.node(depth - 2);
  const first = $pos.indexAt(depth - 1) === 0;
  const itemStart = $pos.before(depth);
  const listStart = $pos.before(depth - 1);
  const grown = tuckFollowing(tr, spot);
  const itemEnd = $pos.after(depth - 1) - 1 + grown;
  const listEnd = itemEnd + 1;
  const parentEnd = $pos.after(depth - 2) + grown;
  const trailing = parentEnd - 1 - listEnd;

  if (trailing > 0 && !first) {
    tr.step({ kind: 'move', from: itemStart, to: itemEnd, target: parentEnd });
    return;
  }
  if (trailing > 0) {
    tr.step({ kind: 'move', from: listEnd, to: parentEnd - 1, target: listStart });
  }

  const shell = shellOf(schema, parentItem);

  tr.step({
    kind: 'replaceAround',
    from: (first ? listStart : itemStart) + trailing,
    to: parentEnd,
    gapFrom: itemStart + trailing,
    gapTo: itemEnd + trailing,
    slice: {
      content: [first ? shell : withContent(shell, [shellOf(schema, list)])],
      openStart: first ? 1 : 2,
      openEnd: 0,
    },
    insert: first ? 1 : 2,
  });
};

const liftItem = (tr: Transaction, spot: ItemSpot, head: number): boolean => {
  const { $pos, depth } = spot;

  if (depth >= 3 && isList(tr.doc.schema, $pos.node(depth - 3))) {
    liftToOuterList(tr, spot);
  } else {
    liftOutOfList(tr, spot);
  }
  tr.setSelection(textSelection(tr.mapping.map(head)));
  return true;
};

const liftPlanOf = (schema: Schema, spot: ItemSpot): LiftPlan => {
  const { $pos, depth } = spot;
  const list = $pos.node(depth - 1);
  const index = $pos.indexAt(depth - 1);

  return {
    nested: depth >= 3 && isList(schema, $pos.node(depth - 3)),
    list,
    item: $pos.node(depth),
    head: index > 0 ? [list] : [],
    tail: index + 1 < list.content.length ? [list] : [],
  };
};

const liftFits = (schema: Schema, spot: ItemSpot, plan: LiftPlan): boolean => {
  const { $pos, depth } = spot;
  const { item } = plan;
  const end = item.content.length;

  if (plan.nested) {
    const parentItem = $pos.node(depth - 2);
    const at = $pos.indexAt(depth - 2);

    return (
      fits(schema, $pos.node(depth - 3), $pos.indexAt(depth - 3), [parentItem, item]) &&
      fits(schema, parentItem, at, plan.head) &&
      splices(schema, item, end, end, plan.tail)
    );
  }
  const parent = $pos.node(depth - 2);
  const at = $pos.indexAt(depth - 2);

  return (
    fits(schema, parent, at, [plan.list, ...item.content, ...plan.tail]) &&
    fits(schema, parent, at, [...plan.head, ...item.content, ...plan.tail])
  );
};

const liftedParentFits = (
  schema: Schema,
  spot: ItemSpot,
  plan: LiftPlan,
  wrapper: readonly ContentNode[],
): boolean => {
  const { $pos, depth } = spot;
  const { item } = plan;

  if ($pos.depth > depth + 1) {
    return fits(schema, $pos.node($pos.depth - 1), $pos.indexAt($pos.depth - 1), wrapper);
  }
  const at = $pos.indexAt(depth);
  const rest = item.content.slice(at + 1);

  if (plan.nested) {
    return splices(schema, item, at, item.content.length, [...wrapper, ...rest, ...plan.tail]);
  }
  return fits(schema, $pos.node(depth - 2), $pos.indexAt(depth - 2), [
    ...plan.head,
    ...item.content.slice(0, at),
    ...wrapper,
    ...rest,
    ...plan.tail,
  ]);
};

const relistFits = (schema: Schema, spot: ItemSpot, listType: string, attrs: Attrs): boolean => {
  const { $pos, depth } = spot;
  const plan = liftPlanOf(schema, spot);
  const itemType = firstItemOf(schema, listType);
  const cut = plan.nested ? depth - 3 : depth - 2;
  const lifted = $pos.depth - 2;
  const above = lifted - 2;

  if (
    itemType === undefined ||
    lifted < 1 ||
    (lifted >= 2 && isList(schema, $pos.node(above <= cut ? above : above + 2)))
  ) {
    return false;
  }

  const wrapper = wrapped(
    schema,
    [
      { type: listType, attrs },
      { type: itemType, attrs: {} },
    ],
    [$pos.parent],
    probeId,
  );

  return (
    liftFits(schema, spot, plan) &&
    nestedValid(schema, wrapper[0], $pos.parent) &&
    liftedParentFits(schema, spot, plan, wrapper)
  );
};

export const liftListItem: Command = (state, dispatch) => {
  const spot = itemSpot(state);
  const head = headOf(state);

  if (spot === undefined || head === undefined) {
    return false;
  }
  return dispatch === undefined
    ? probe(() => liftFits(state.doc.schema, spot, liftPlanOf(state.doc.schema, spot)))
    : attempt(state, dispatch, (tr) => liftItem(tr, spot, head));
};

const sinkFits = (
  schema: Schema,
  list: ElementNode,
  index: number,
  previous: ElementNode,
  item: ElementNode,
): boolean => {
  const last = previous.content.at(-1);
  const end = previous.content.length;
  const stays = splices(schema, list, index, index + 1, []);

  if (last?.kind === ContentNodeKind.Element && last.type === list.type) {
    return stays && splices(schema, last, last.content.length, last.content.length, [item]);
  }
  return (
    stays &&
    splices(schema, previous, end, end, [list]) &&
    schema.nodes.get(list.type)?.content.matchContent([item])?.validEnd === true
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

  if (previous?.kind !== ContentNodeKind.Element) {
    return false;
  }
  const last = previous.content.at(-1);

  const inner =
    last?.kind === ContentNodeKind.Element && last.type === list.type ? last : undefined;

  if (dispatch === undefined) {
    return probe(() => sinkFits(state.doc.schema, list, index, previous, item));
  }
  return attempt(state, dispatch, (tr) => {
    const { schema } = state.doc;

    tr.step({
      kind: 'replaceAround',
      from: itemStart - (inner === undefined ? 1 : 2),
      to: $pos.after(depth),
      gapFrom: itemStart,
      gapTo: $pos.after(depth),
      slice: {
        content: [
          withContent(shellOf(schema, previous), [
            inner === undefined
              ? schema.element(list.type, { id: tr.newId() })
              : shellOf(schema, inner),
          ]),
        ],
        openStart: inner === undefined ? 1 : 2,
        openEnd: 0,
      },
      insert: inner === undefined ? 1 : 0,
    });

    tr.setSelection(textSelection(tr.mapping.map(head)));
    return true;
  });
};

const cursorSpot = (state: EditorState): ItemSpot | undefined => {
  const spot = itemSpot(state);

  return spot !== undefined &&
    state.selection.kind === SelectionKind.Text &&
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
    [...schema.nodes.values()].every(
      (candidate) =>
        !candidate.groups.has('block') || type.content.matchType(candidate.name) !== undefined,
    )
  );
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
  const childStart = $pos.before($pos.depth);
  const wrapperStart = $pos.before($pos.depth - 1);

  return attempt(state, dispatch, (tr) => {
    const lifted =
      wrapper.content.length === 1
        ? unwrap(tr, $pos, $pos.depth - 1)
        : tr.maybeStep({
            kind: 'move',
            from: childStart,
            to: $pos.after($pos.depth),
            target: wrapperStart,
          }).ok;

    if (lifted) {
      tr.setSelection(textSelection(tr.mapping.map(head)));
    }
    return lifted;
  });
};

export const exitEmptyLast: Command = (state, dispatch) => {
  const head = headOf(state);
  const $pos = head === undefined ? undefined : state.doc.resolve(head);

  if (
    $pos === undefined ||
    state.selection.kind !== SelectionKind.Text ||
    !isCursor(state.selection) ||
    $pos.depth < 2 ||
    $pos.parent.content.length > 0
  ) {
    return false;
  }
  const wrapper = $pos.node($pos.depth - 1);
  const type = state.doc.schema.nodes.get(wrapper.type);

  if (
    type?.groups.has('block') !== true ||
    type.groups.has('list') ||
    wrapper.content.length < 2 ||
    $pos.indexAt($pos.depth - 1) !== wrapper.content.length - 1
  ) {
    return false;
  }
  const start = $pos.before($pos.depth);
  const size = nodeSize($pos.parent);
  const after = $pos.after($pos.depth - 1);

  return attempt(state, dispatch, (tr) => {
    tr.step({ kind: 'move', from: start, to: start + size, target: after });
    tr.setSelection(textSelection(after - size + 1));
    return true;
  });
};

export const caretAtEnd: Command = (state, dispatch) => {
  const { doc } = state;
  const last = doc.root.content.at(-1);
  const at = last?.kind === ContentNodeKind.Element ? doc.positionOf(last.id) : undefined;
  const type = last?.kind === ContentNodeKind.Element ? doc.schema.nodes.get(last.type) : undefined;

  if (last === undefined || at === undefined) {
    return false;
  }
  if (type?.inlineContent === true) {
    dispatch?.(state.tr.setSelection(textSelection(at + nodeSize(last) - 1)));
    return true;
  }
  if (isBlockAtom(doc.schema, last)) {
    dispatch?.(state.tr.setSelection({ kind: 'gap', id: last.id, side: 'end' }));
    return true;
  }
  return attempt(state, dispatch, (tr) => {
    const block = emptyTextblock(doc.schema, tr.newId());
    const end = at + nodeSize(last);

    if (block === undefined) {
      return false;
    }
    tr.insert(end, [block]);
    tr.setSelection(textSelection(end + 1));
    return true;
  });
};

export const liftAtStart: Command = (state, dispatch) => {
  const head = headOf(state);

  if (
    head === undefined ||
    state.selection.kind !== SelectionKind.Text ||
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
  (
    wrap: (tr: Transaction, pos: number) => boolean,
    fitsAt: (doc: Doc, pos: number) => boolean,
  ): Command =>
  (state, dispatch) => {
    const head = headOf(state);

    if (head === undefined) {
      return false;
    }
    return dispatch === undefined
      ? probe(() => fitsAt(state.doc, head))
      : attempt(state, dispatch, (tr) => wrap(tr, head));
  };

export const turnIntoList = (listType: string, attrs: Attrs = {}): Command =>
  toggleWrap(
    (tr, pos) => wrapInList(tr, pos, listType, attrs),
    (doc, pos) => canWrapInList(doc, pos, listType, attrs),
  );

export const wrapInBlock = (type: string, attrs: Attrs = {}): Command =>
  toggleWrap(
    (tr, pos) => wrapTextblock(tr, pos, [{ type, attrs }]),
    (doc, pos) => wrapFits(doc, pos, [{ type, attrs }], probeId),
  );

const listTypeAt = (state: EditorState): string | undefined =>
  ancestorTypes(state).find((type) => state.doc.schema.nodes.get(type)?.groups.has('list'));

export const toggleList = (listType: string, attrs: Attrs = {}): Command => {
  const wrap = turnIntoList(listType, attrs);

  return (state, dispatch) => {
    const current = listTypeAt(state);

    if (current === listType) {
      return liftListItem(state, dispatch);
    }
    if (current === undefined) {
      return wrap(state, dispatch);
    }
    if (dispatch !== undefined) {
      return sequence(liftListItem, wrap)(state, dispatch);
    }
    const spot = itemSpot(state);

    return spot !== undefined && probe(() => relistFits(state.doc.schema, spot, listType, attrs));
  };
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
    if (dispatch === undefined) {
      return probe(() =>
        fits(
          state.doc.schema,
          $pos.node(depth - 1),
          $pos.indexAt(depth - 1),
          $pos.node(depth).content,
        ),
      );
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

export const followingTextblock = (schema: Schema, parent: ElementNode): string | undefined =>
  [...(schema.nodes.get(parent.type)?.content.next.keys() ?? [])].find((name) => {
    const type = schema.nodes.get(name);

    return (
      type?.inlineContent === true &&
      Object.values(type.attrs).every((attr) => attr.default !== undefined)
    );
  });

export const caretInto = (tr: Transaction, start: number): void => {
  const caret = textPosition(tr.doc, start, 1);

  if (caret !== undefined) {
    tr.setSelection(textSelection(caret));
  }
};

const insertFits = (state: EditorState, build: (make: BlockMaker) => ElementNode): boolean => {
  const { doc } = state;
  const { schema } = doc;
  const make: BlockMaker = { doc: { schema }, newId: probeId };
  const head = headOf(state);
  const $pos = head === undefined ? undefined : doc.resolve(head);

  if (state.selection.kind === SelectionKind.Gap) {
    const spot = gapSpot(doc, state.selection);

    return (
      spot !== undefined &&
      splices(schema, spot.parent, gapIndexOf(spot), gapIndexOf(spot), [build(make)])
    );
  }
  if ($pos === undefined || $pos.depth < 1 || !isTextblock(schema, $pos.parent)) {
    return false;
  }
  const parent = $pos.node($pos.depth - 1);
  const index = $pos.indexAt($pos.depth - 1);

  if ($pos.parent.content.length === 0) {
    return fits(schema, parent, index, [build(make), $pos.parent]);
  }
  const next = followingTextblock(schema, parent);

  return (
    next !== undefined &&
    splices(schema, parent, index + 1, index + 1, [
      build(make),
      schema.element(next, { id: PROBE_ID }),
    ])
  );
};

export const insertBlock =
  (build: (make: BlockMaker) => ElementNode): Command =>
  (state, dispatch) => {
    const head = headOf(state);
    const $pos = head === undefined ? undefined : state.doc.resolve(head);

    if (dispatch === undefined) {
      return probe(() => insertFits(state, build));
    }
    if (state.selection.kind === SelectionKind.Gap) {
      return attempt(state, dispatch, (tr) => insertAtGap(tr, build));
    }
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
