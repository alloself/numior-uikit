import {
  ContentNodeKind,
  nodeSize,
  sameAttrs,
  sameMarks,
  type Attrs,
  type ContentNode,
  type ElementNode,
  type Mark,
  type Schema,
  type TextNode,
  type Transaction,
} from '@numior/editor-core';
import { commonRun, commonSpan } from './common-run';
import { risingRun } from './rising-run';
import type { Adopt } from './yjs.types';

type Change =
  | { readonly kind: typeof ChangeKind.Attrs; readonly at: number; readonly attrs: Attrs }
  | Replace
  | {
      readonly kind: typeof ChangeKind.AddMark | typeof ChangeKind.RemoveMark;
      readonly at: number;
      readonly to: number;
      readonly mark: Mark;
    };

interface Replace {
  readonly kind: typeof ChangeKind.Replace;
  readonly at: number;
  readonly to: number;
  readonly removed: readonly ContentNode[];
  readonly content: readonly ContentNode[];
}

interface Piece {
  readonly node: ContentNode;
  readonly from: number;
  readonly to: number;
}

interface Line {
  readonly text: string;
  readonly pieces: readonly Piece[];
  readonly inlines: ReadonlyMap<number, ElementNode>;
  readonly offsets: readonly number[] | undefined;
}

interface Collected {
  readonly schema: Schema;
  readonly changes: Change[];
  readonly adopt: Adopt | undefined;
}

interface Region {
  readonly from: number;
  readonly to: number;
  readonly delta: number;
  readonly start: number;
}

interface Span {
  readonly at: number;
  readonly to: number;
}

interface Ends {
  readonly head: number;
  readonly tail: number;
}

interface Gap {
  readonly from: number;
  readonly to: number;
  readonly put: number;
  readonly until: number;
}

const ChangeKind = {
  Attrs: 'attrs',
  Replace: 'replace',
  AddMark: 'addMark',
  RemoveMark: 'removeMark',
} as const;

const INLINE_UNIT = '￼';

const NO_MARKS: readonly Mark[] = [];

const NOT_KEPT = -1;

const CHANGE_ORDER: Readonly<Record<Change['kind'], number>> = {
  [ChangeKind.RemoveMark]: 0,
  [ChangeKind.AddMark]: 1,
  [ChangeKind.Attrs]: 2,
  [ChangeKind.Replace]: 3,
};

const sameText = (left: TextNode, right: ContentNode): boolean =>
  right.kind === ContentNodeKind.Text &&
  left.text === right.text &&
  sameMarks(left.marks, right.marks);

const sameNode = (left: ContentNode | undefined, right: ContentNode | undefined): boolean => {
  if (left === right) {
    return true;
  }
  if (left === undefined || right === undefined) {
    return false;
  }
  if (left.kind === ContentNodeKind.Text) {
    return sameText(left, right);
  }
  return (
    right.kind === ContentNodeKind.Element &&
    left.id === right.id &&
    left.type === right.type &&
    sameAttrs(left.attrs, right.attrs) &&
    sameContent(left.content, right.content)
  );
};

const sameContent = (left: readonly ContentNode[], right: readonly ContentNode[]): boolean =>
  left.length === right.length && left.every((node, index) => sameNode(node, right[index]));

const sizeOf = (content: readonly ContentNode[], from: number, to: number): number => {
  let size = 0;

  for (let index = from; index < to; index += 1) {
    const node = content[index];

    size += node === undefined ? 0 : nodeSize(node);
  }
  return size;
};

const sameShell = (left: ElementNode, right: ElementNode): boolean =>
  left.id === right.id && left.type === right.type;

const offsetsOf = (pieces: readonly Piece[], length: number): readonly number[] => {
  const offsets = Array.from({ length: length + 1 }, () => 0);
  let offset = 0;

  for (const piece of pieces) {
    for (let unit = piece.from; unit < piece.to; unit += 1) {
      offsets[unit] = offset;
      offset += piece.node.kind === ContentNodeKind.Text ? 1 : nodeSize(piece.node);
    }
  }
  offsets[length] = offset;
  return offsets;
};

const lineOf = (content: readonly ContentNode[]): Line => {
  const pieces: Piece[] = [];
  const inlines = new Map<number, ElementNode>();
  let text = '';
  let sized = false;

  for (const node of content) {
    const from = text.length;

    if (node.kind === ContentNodeKind.Text) {
      text += node.text;
    } else {
      text += INLINE_UNIT;
      inlines.set(from, node);
      sized ||= node.size !== 1;
    }
    pieces.push({ node, from, to: text.length });
  }

  return { text, pieces, inlines, offsets: sized ? offsetsOf(pieces, text.length) : undefined };
};

const offsetOf = (line: Line, unit: number): number => line.offsets?.[unit] ?? unit;

const sameUnit = (before: Line, after: Line, left: number, right: number): boolean => {
  if (before.text[left] !== after.text[right]) {
    return false;
  }

  const one = before.inlines.get(left);
  const other = after.inlines.get(right);

  return one === undefined || other === undefined ? one === other : sameShell(one, other);
};

const pieceAt = (line: Line, unit: number): number => {
  let low = 0;
  let high = line.pieces.length - 1;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);

    if ((line.pieces[middle]?.from ?? 0) <= unit) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
};

const marksOf = (node: ContentNode): readonly Mark[] =>
  node.kind === ContentNodeKind.Text ? node.marks : NO_MARKS;

const holds = (marks: readonly Mark[], mark: Mark): boolean =>
  marks.some((each) => each.type === mark.type && sameAttrs(each.attrs, mark.attrs));

const markChanges = (
  collected: Collected,
  span: Span,
  before: readonly Mark[],
  after: readonly Mark[],
): void => {
  for (const mark of before) {
    if (holds(after, mark)) {
      continue;
    }
    collected.changes.push({ kind: ChangeKind.RemoveMark, at: span.at, to: span.to, mark });
  }
  for (const mark of after) {
    if (holds(before, mark)) {
      continue;
    }
    collected.changes.push({ kind: ChangeKind.AddMark, at: span.at, to: span.to, mark });
  }
};

const inlineChange = (
  collected: Collected,
  left: ContentNode,
  right: ContentNode,
  span: Span,
): void => {
  if (left.kind !== ContentNodeKind.Element || right.kind !== ContentNodeKind.Element) {
    return;
  }
  if (!sameContent(left.content, right.content)) {
    collected.changes.push({
      kind: ChangeKind.Replace,
      at: span.at,
      to: span.to,
      removed: [left],
      content: [right],
    });

    return;
  }
  if (sameAttrs(left.attrs, right.attrs)) {
    return;
  }
  collected.changes.push({ kind: ChangeKind.Attrs, at: span.at, attrs: right.attrs });
};

const pieceChanges = (
  collected: Collected,
  left: ContentNode,
  right: ContentNode,
  span: Span,
): void => {
  if (left === right) {
    return;
  }
  markChanges(collected, span, marksOf(left), marksOf(right));
  inlineChange(collected, left, right, span);
};

const alignedChanges = (collected: Collected, before: Line, after: Line, region: Region): void => {
  const { to, delta, start } = region;
  let unit = region.from;
  let left = pieceAt(before, unit);
  let right = pieceAt(after, unit + delta);

  while (unit < to) {
    const one = before.pieces[left];
    const other = after.pieces[right];
    if (one === undefined || other === undefined) {
      return;
    }

    const end = Math.min(to, one.to, other.to - delta);

    if (end <= unit) {
      return;
    }

    pieceChanges(collected, one.node, other.node, {
      at: start + offsetOf(before, unit),
      to: start + offsetOf(before, end),
    });

    unit = end;
    left += unit >= one.to ? 1 : 0;
    right += unit + delta >= other.to ? 1 : 0;
  }
};

const textPart = (collected: Collected, node: TextNode, from: number, to: number): TextNode =>
  from === 0 && to === node.text.length
    ? node
    : collected.schema.text(node.text.slice(from, to), node.marks);

const piecesIn = (line: Line, from: number, to: number): readonly ContentNode[] =>
  line.pieces.reduce<ContentNode[]>((nodes, piece) => {
    if (piece.from < to && piece.to > from) {
      nodes.push(piece.node);
    }
    return nodes;
  }, []);

const sliceLine = (
  collected: Collected,
  line: Line,
  from: number,
  to: number,
): readonly ContentNode[] => {
  const content: ContentNode[] = [];

  for (const piece of line.pieces) {
    const start = Math.max(from, piece.from);
    const end = Math.min(to, piece.to);

    if (start >= end) {
      continue;
    }

    content.push(
      piece.node.kind === ContentNodeKind.Text
        ? textPart(collected, piece.node, start - piece.from, end - piece.from)
        : piece.node,
    );
  }
  return content;
};

const lineChanges = (
  collected: Collected,
  before: readonly ContentNode[],
  after: readonly ContentNode[],
  start: number,
): void => {
  const left = lineOf(before);
  const right = lineOf(after);

  const { head, tail } = commonSpan(left.text, right.text, (one, other) =>
    sameUnit(left, right, one, other),
  );

  const leftEnd = left.text.length - tail;
  const rightEnd = right.text.length - tail;

  alignedChanges(collected, left, right, { from: 0, to: head, delta: 0, start });

  if (head < leftEnd || head < rightEnd) {
    collected.changes.push({
      kind: ChangeKind.Replace,
      at: start + offsetOf(left, head),
      to: start + offsetOf(left, leftEnd),
      removed: piecesIn(left, head, leftEnd),
      content: sliceLine(collected, right, head, rightEnd),
    });
  }

  alignedChanges(collected, left, right, {
    from: leftEnd,
    to: left.text.length,
    delta: rightEnd - leftEnd,
    start,
  });
};

const keptIndices = (
  removed: readonly ContentNode[],
  added: readonly ContentNode[],
): readonly number[] => {
  const index = new Map<string, number>();

  removed.forEach((node, at) => {
    if (node.kind !== ContentNodeKind.Element) {
      return;
    }
    index.set(node.id, at);
  });

  const matched = added.map((node) => {
    const at = node.kind === ContentNodeKind.Element ? index.get(node.id) : undefined;
    const old = at === undefined ? undefined : removed[at];

    return old?.kind === ContentNodeKind.Element &&
      node.kind === ContentNodeKind.Element &&
      sameShell(old, node)
      ? (at ?? NOT_KEPT)
      : NOT_KEPT;
  });

  const run = risingRun(matched);

  return matched.map((at, place) => (run.has(place) ? at : NOT_KEPT));
};

const gapChange = (
  collected: Collected,
  removed: readonly ContentNode[],
  added: readonly ContentNode[],
  gap: Gap,
  at: number,
): number => {
  const size = sizeOf(removed, gap.from, gap.to);

  if (gap.from < gap.to || gap.put < gap.until) {
    collected.changes.push({
      kind: ChangeKind.Replace,
      at,
      to: at + size,
      removed: removed.slice(gap.from, gap.to),
      content: added.slice(gap.put, gap.until),
    });
  }
  return at + size;
};

const commonEnds = (
  before: readonly ContentNode[],
  after: readonly ContentNode[],
  same: (left: ContentNode | undefined, right: ContentNode | undefined) => boolean = sameNode,
): Ends => {
  const limit = Math.min(before.length, after.length);
  const head = commonRun(limit, (index) => same(before[index], after[index]));

  const tail = commonRun(limit - head, (index) =>
    same(before[before.length - 1 - index], after[after.length - 1 - index]),
  );

  return { head, tail };
};

const matched = (
  collected: Collected,
  left: ContentNode | undefined,
  right: ContentNode | undefined,
): boolean => {
  if (!sameNode(left, right)) {
    return false;
  }
  if (
    left !== right &&
    left?.kind === ContentNodeKind.Element &&
    right?.kind === ContentNodeKind.Element
  ) {
    collected.adopt?.(left, right);
  }
  return true;
};

const blockChanges = (
  collected: Collected,
  before: readonly ContentNode[],
  after: readonly ContentNode[],
  start: number,
): void => {
  const { head, tail } = commonEnds(before, after, (one, other) => matched(collected, one, other));
  const removed = before.slice(head, before.length - tail);
  const added = after.slice(head, after.length - tail);
  let at = start + sizeOf(before, 0, head);
  let from = 0;
  let put = 0;

  for (const [place, old] of keptIndices(removed, added).entries()) {
    const left = removed[old];
    const right = added[place];

    if (old === NOT_KEPT || left === undefined || right === undefined) {
      continue;
    }

    at = gapChange(collected, removed, added, { from, to: old, put, until: place }, at);
    nodeChanges(collected, left, right, at);
    at += nodeSize(left);
    from = old + 1;
    put = place + 1;
  }

  gapChange(collected, removed, added, { from, to: removed.length, put, until: added.length }, at);
};

const childrenChanges = (
  collected: Collected,
  before: ElementNode,
  after: ElementNode,
  start: number,
): void => {
  if (collected.schema.nodes.get(before.type)?.inlineContent === true) {
    lineChanges(collected, before.content, after.content, start);
    return;
  }
  blockChanges(collected, before.content, after.content, start);
};

const nodeChanges = (
  collected: Collected,
  before: ContentNode,
  after: ContentNode,
  at: number,
): void => {
  if (
    before === after ||
    before.kind !== ContentNodeKind.Element ||
    after.kind !== ContentNodeKind.Element
  ) {
    return;
  }
  const sameAttributes = sameAttrs(before.attrs, after.attrs);

  if (!sameAttributes) {
    collected.changes.push({ kind: ChangeKind.Attrs, at, attrs: after.attrs });
  }
  if (!sameContent(before.content, after.content)) {
    childrenChanges(collected, before, after, at + 1);
    return;
  }
  if (!sameAttributes) {
    return;
  }
  collected.adopt?.(before, after);
};

const isReplace = (change: Change): change is Replace => change.kind === ChangeKind.Replace;

const isShape = (change: Change): boolean => change.kind !== ChangeKind.Replace;

const shaped = (tr: Transaction, change: Change): Transaction => {
  switch (change.kind) {
    case ChangeKind.Attrs:
      return tr.setNodeAttrs(change.at, change.attrs);
    case ChangeKind.AddMark:
      return tr.addMark(change.at, change.to, change.mark);
    case ChangeKind.RemoveMark:
      return tr.removeMark(change.at, change.to, change.mark);
    case ChangeKind.Replace:
      return tr;
  }
};

const idsIn = (nodes: readonly ContentNode[], into: Set<string>): Set<string> => {
  for (const node of nodes) {
    if (node.kind !== ContentNodeKind.Element) {
      continue;
    }
    into.add(node.id);
    idsIn(node.content, into);
  }
  return into;
};

const waitsOf = (replaces: readonly Replace[]): readonly ReadonlySet<number>[] => {
  const removedBy = new Map<string, number>();

  replaces.forEach((change, index) => {
    for (const id of idsIn(change.removed, new Set())) {
      removedBy.set(id, index);
    }
  });

  return replaces.map((change, index) => {
    const waits = new Set<number>();

    for (const id of idsIn(change.content, new Set())) {
      const remover = removedBy.get(id);

      if (remover === undefined || remover === index) {
        continue;
      }
      waits.add(remover);
    }
    return waits;
  });
};

const replaceOrder = (replaces: readonly Replace[]): readonly Replace[] | undefined => {
  const waits = waitsOf(replaces);
  const done = new Set<number>();
  const ordered: Replace[] = [];
  let pending = replaces.map((_change, index) => index);

  while (pending.length > 0) {
    const ready = pending.filter((index) =>
      [...(waits[index] ?? [])].every((wait) => done.has(wait)),
    );

    if (ready.length === 0) {
      return undefined;
    }
    for (const index of ready) {
      const change = replaces[index];

      done.add(index);

      if (change === undefined) {
        continue;
      }

      ordered.push(change);
    }
    pending = pending.filter((index) => !done.has(index));
  }
  return ordered;
};

const replaced =
  (start: number) =>
  (tr: Transaction, change: Replace): Transaction => {
    const mapping = tr.mapping.slice(start);
    const at = mapping.map(change.at, 1);
    const to = change.to === change.at ? at : Math.max(at, mapping.map(change.to, -1));

    return tr.replace(at, to, { content: change.content, openStart: 0, openEnd: 0 });
  };

const coarse = (tr: Transaction, before: ElementNode, after: ElementNode): Transaction => {
  const { head, tail } = commonEnds(before.content, after.content);
  const from = sizeOf(before.content, 0, head);
  const to = sizeOf(before.content, 0, before.content.length - tail);

  return tr.replace(from, to, {
    content: after.content.slice(head, after.content.length - tail),
    openStart: 0,
    openEnd: 0,
  });
};

export const applyDocChange = (
  tr: Transaction,
  before: ElementNode,
  after: ElementNode,
  schema: Schema,
  adopt?: Adopt,
): Transaction => {
  const collected: Collected = { schema, changes: [], adopt };

  childrenChanges(collected, before, after, 0);

  const replaces = collected.changes.filter(isReplace).toSorted((one, other) => other.at - one.at);
  const ordered = replaceOrder(replaces);

  if (ordered === undefined) {
    return coarse(tr, before, after);
  }

  const marked = collected.changes
    .filter(isShape)
    .toSorted((one, other) => CHANGE_ORDER[one.kind] - CHANGE_ORDER[other.kind])
    .reduce(shaped, tr);

  return ordered.reduce(replaced(marked.mapping.maps.length), marked);
};
