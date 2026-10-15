import type { ResolvedPos, Slice } from '../doc/doc.types';
import { isEmptyDoc } from '../doc/empty';
import { isOwnHTML } from '../html/clipboard';
import { fromHTML } from '../html/parse';
import { contentSize } from '../model/node';
import type { ContentNode, ElementNode } from '../model/node.types';
import type { Schema } from '../schema/schema.types';
import { nearestCursor, textSelection } from '../state/selection';
import type { Command, Transaction } from '../state/state.types';
import { sliceSize } from '../transform/replace';

const LINE = /\r\n?|\n/u;

const headOf = (tr: Transaction): number | undefined =>
  tr.selection.kind === 'text' ? tr.selection.head : undefined;

const inCodeAt = (tr: Transaction, head: number | undefined): boolean =>
  head !== undefined && tr.doc.schema.nodes.get(tr.doc.resolve(head).parent.type)?.code === true;

export const insertPlainText =
  (text: string): Command =>
  (state, dispatch) => {
    const tr = state.tr.deleteSelection();
    const head = headOf(tr);

    if (inCodeAt(tr, head)) {
      dispatch?.(tr.insertText(text.replaceAll(/\r\n?/gu, '\n')));
      return true;
    }
    const lines = text.split(LINE);

    if (lines.length === 1 || head === undefined) {
      tr.insertText(lines.join(' '));
      dispatch?.(tr);
      return true;
    }
    const cursor = tr.doc.resolve(head);
    const before = cursor.nodeBefore;
    const marks = tr.storedMarks ?? (before?.kind === 'text' ? before.marks : []);
    const { schema } = tr.doc;

    const content = lines.map((line) =>
      schema.element(cursor.parent.type, {
        id: tr.newId(),
        attrs: cursor.parent.attrs,
        content: line === '' ? [] : [schema.text(line, marks)],
      }),
    );

    const slice = { content, openStart: 1, openEnd: 1 };

    tr.replace(head, head, slice).setSelection(textSelection(head + sliceSize(slice)));
    dispatch?.(tr);
    return true;
  };

const isTextblock = (schema: Schema, node: ContentNode | undefined): node is ElementNode =>
  node?.kind === 'element' && schema.nodes.get(node.type)?.inlineContent === true;

const replaced = (tr: Transaction, from: number, to: number, slice: Slice): boolean =>
  tr.maybeStep({ kind: 'replace', from, to, slice }).ok;

const pasteInline = (tr: Transaction, head: number, block: ElementNode): boolean => {
  if (!replaced(tr, head, head, { content: block.content, openStart: 0, openEnd: 0 })) {
    return false;
  }
  tr.setSelection(textSelection(head + contentSize(block.content)));
  return true;
};

const fillEmpty = (
  tr: Transaction,
  cursor: ResolvedPos,
  blocks: readonly ElementNode[],
): boolean => {
  const from = cursor.before(cursor.depth);
  const to = cursor.after(cursor.depth);

  if (
    cursor.parent.content.length > 0 ||
    !replaced(tr, from, to, { content: blocks, openStart: 0, openEnd: 0 })
  ) {
    return false;
  }
  tr.setSelection(nearestCursor(tr.doc, from + contentSize(blocks), -1));
  return true;
};

const mergeBlocks = (
  tr: Transaction,
  cursor: ResolvedPos,
  blocks: readonly ElementNode[],
): boolean => {
  const { schema } = tr.doc;
  const { parent } = cursor;

  const edge = (keep: boolean): ElementNode[] =>
    keep ? [] : [schema.element(parent.type, { id: tr.newId(), attrs: parent.attrs })];

  const slice = {
    content: [
      ...edge(isTextblock(schema, blocks[0])),
      ...blocks,
      ...edge(isTextblock(schema, blocks.at(-1))),
    ],
    openStart: 1,
    openEnd: 1,
  };

  if (!replaced(tr, cursor.pos, cursor.pos, slice)) {
    return false;
  }
  tr.setSelection(textSelection(cursor.pos + sliceSize(slice)));
  return true;
};

const insertBlocks = (tr: Transaction, head: number, blocks: readonly ElementNode[]): boolean => {
  const cursor = tr.doc.resolve(head);
  const [first] = blocks;

  if (first === undefined || fillEmpty(tr, cursor, blocks)) {
    return first !== undefined;
  }
  return blocks.length === 1 && isTextblock(tr.doc.schema, first)
    ? pasteInline(tr, head, first)
    : mergeBlocks(tr, cursor, blocks);
};

const linesOf = (schema: Schema, block: ElementNode): readonly ContentNode[][] =>
  schema.nodes.get(block.type)?.code === true
    ? block.content
        .flatMap((node) => (node.kind === 'text' ? [node.text] : []))
        .join('')
        .split('\n')
        .map((line) => (line === '' ? [] : [schema.text(line)]))
    : [[...block.content]];

const textblocksOf = (schema: Schema, nodes: readonly ContentNode[]): ElementNode[] =>
  nodes.flatMap((node) => {
    if (node.kind === 'text') {
      return [];
    }
    return schema.nodes.get(node.type)?.inlineContent === true
      ? [node]
      : textblocksOf(schema, node.content);
  });

const flatten = (
  tr: Transaction,
  parent: ElementNode,
  blocks: readonly ElementNode[],
): ElementNode[] => {
  const { schema } = tr.doc;

  return textblocksOf(schema, blocks).flatMap((block) =>
    linesOf(schema, block).map((content) =>
      schema.element(parent.type, { id: tr.newId(), attrs: parent.attrs, content }),
    ),
  );
};

const parsedBlocks = (tr: Transaction, html: string): ElementNode[] => {
  const doc = fromHTML(tr.doc.schema, html, {
    ids: { next: () => tr.newId() },
    whitespace: isOwnHTML(html) ? 'preserve' : 'collapse',
  });

  return isEmptyDoc(doc)
    ? []
    : doc.root.content.filter((node): node is ElementNode => node.kind === 'element');
};

export const insertHTML =
  (html: string, text: string): Command =>
  (state, dispatch) => {
    const tr = state.tr.deleteSelection();
    const head = headOf(tr);
    const blocks = head === undefined || inCodeAt(tr, head) ? [] : parsedBlocks(tr, html);

    const placed =
      head !== undefined &&
      (insertBlocks(tr, head, blocks) ||
        insertBlocks(tr, head, flatten(tr, tr.doc.resolve(head).parent, blocks)));

    if (!placed) {
      return insertPlainText(text)(state, dispatch);
    }
    dispatch?.(tr);
    return true;
  };

export const pasteCommand = (text: string, html: string | undefined): Command =>
  html === undefined || html === '' ? insertPlainText(text) : insertHTML(html, text);
