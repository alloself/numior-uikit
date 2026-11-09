import {
  ContentNodeKind,
  nodeSize,
  sameAttrs,
  sameMarks,
  type Attrs,
  type ContentNode,
  type ElementNode,
  type TextNode,
  type Transaction,
} from '@numior/editor-core';
import { commonRun } from './common-run';

type Change =
  | { readonly kind: typeof ChangeKind.None }
  | { readonly kind: typeof ChangeKind.Attrs; readonly pos: number; readonly attrs: Attrs }
  | {
      readonly kind: typeof ChangeKind.Replace;
      readonly from: number;
      readonly to: number;
      readonly content: readonly ContentNode[];
    };

type TextMaker = (text: string, marks: TextNode['marks']) => TextNode;

const ChangeKind = { None: 'none', Attrs: 'attrs', Replace: 'replace' } as const;

const sameNode = (left: ContentNode | undefined, right: ContentNode | undefined): boolean => {
  if (left === right) {
    return true;
  }
  if (left === undefined || right === undefined) {
    return false;
  }
  if (left.kind === ContentNodeKind.Text || right.kind === ContentNodeKind.Text) {
    return (
      left.kind === right.kind &&
      left.kind === ContentNodeKind.Text &&
      right.kind === ContentNodeKind.Text &&
      left.text === right.text &&
      sameMarks(left.marks, right.marks)
    );
  }
  return (
    left.id === right.id &&
    left.type === right.type &&
    sameAttrs(left.attrs, right.attrs) &&
    sameContent(left.content, right.content)
  );
};

const sameContent = (left: readonly ContentNode[], right: readonly ContentNode[]): boolean => {
  return left.length === right.length && left.every((node, index) => sameNode(node, right[index]));
};

const sizeOf = (content: readonly ContentNode[]): number =>
  content.reduce((sum, node) => sum + nodeSize(node), 0);

const sameElementShell = (left: ElementNode, right: ElementNode): boolean =>
  left.id === right.id && left.type === right.type;

const textChange = (left: TextNode, right: TextNode, at: number, schemaText: TextMaker): Change => {
  const limit = Math.min(left.text.length, right.text.length);
  const head = commonRun(limit, (index) => left.text[index] === right.text[index]);

  const tail = commonRun(
    limit - head,
    (index) =>
      left.text[left.text.length - 1 - index] === right.text[right.text.length - 1 - index],
  );

  const inserted = right.text.slice(head, right.text.length - tail);

  return {
    kind: ChangeKind.Replace,
    from: at + head,
    to: at + left.text.length - tail,
    content: inserted === '' ? [] : [schemaText(inserted, right.marks)],
  };
};

const singleChange = (
  left: ContentNode,
  right: ContentNode,
  at: number,
  text: TextMaker,
): Change | undefined => {
  if (
    left.kind === ContentNodeKind.Text &&
    right.kind === ContentNodeKind.Text &&
    sameMarks(left.marks, right.marks)
  ) {
    return textChange(left, right, at, text);
  }
  if (
    left.kind !== ContentNodeKind.Element ||
    right.kind !== ContentNodeKind.Element ||
    !sameElementShell(left, right)
  ) {
    return undefined;
  }
  if (sameContent(left.content, right.content)) {
    return { kind: ChangeKind.Attrs, pos: at, attrs: right.attrs };
  }
  return sameAttrs(left.attrs, right.attrs)
    ? contentChange(left.content, right.content, at + 1, text)
    : undefined;
};

const contentChange = (
  before: readonly ContentNode[],
  after: readonly ContentNode[],
  start: number,
  text: TextMaker,
): Change => {
  const limit = Math.min(before.length, after.length);
  const head = commonRun(limit, (index) => sameNode(before[index], after[index]));

  const tail = commonRun(limit - head, (index) =>
    sameNode(before[before.length - 1 - index], after[after.length - 1 - index]),
  );

  const removed = before.slice(head, before.length - tail);
  const added = after.slice(head, after.length - tail);
  const from = start + sizeOf(before.slice(0, head));
  const [left] = removed;
  const [right] = added;

  if (removed.length === 0 && added.length === 0) {
    return { kind: ChangeKind.None };
  }

  const inner =
    removed.length === 1 && added.length === 1 && left !== undefined && right !== undefined
      ? singleChange(left, right, from, text)
      : undefined;

  return inner ?? { kind: ChangeKind.Replace, from, to: from + sizeOf(removed), content: added };
};

export const applyDocChange = (
  tr: Transaction,
  before: ElementNode,
  after: ElementNode,
  text: TextMaker,
): Transaction => {
  const change = contentChange(before.content, after.content, 0, text);

  switch (change.kind) {
    case ChangeKind.None:
      return tr;
    case ChangeKind.Attrs:
      return tr.setNodeAttrs(change.pos, change.attrs);
    case ChangeKind.Replace:
      return tr.replace(change.from, change.to, {
        content: change.content,
        openStart: 0,
        openEnd: 0,
      });
  }
};
