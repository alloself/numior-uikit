import {
  insertBeforeTextblock,
  retypeTextblock,
  wrapInList,
  wrapTextblock,
} from '../commands/blocks';
import { ContentNodeKind, type AttrValue } from '../model/node.types';
import type { Transaction } from '../state/state.types';
import { TaskMark, type InputRule } from './input-rules.types';

type Attrs = Readonly<Record<string, AttrValue>>;

type Build = (tr: Transaction, pos: number, match: RegExpExecArray) => boolean;

const blockRule = (match: RegExp, build: Build): InputRule => ({
  match,
  apply: (tr, found, from, to) => {
    const first = tr.steps.length;

    if (tr.doc.resolve(from).parentOffset !== 0 || !build(tr, from, found)) {
      return false;
    }
    const mapping = tr.mapping.slice(first);

    tr.delete(mapping.map(from), mapping.map(to));
    return true;
  },
});

const has = (tr: Transaction, type: string, attr?: string): boolean => {
  const spec = tr.doc.schema.nodes.get(type);

  return spec !== undefined && (attr === undefined || Object.hasOwn(spec.attrs, attr));
};

const retype =
  (type: string, attrs: (match: RegExpExecArray) => Attrs = () => ({})): Build =>
  (tr, pos, match) =>
    has(tr, type) && retypeTextblock(tr, pos, type, attrs(match));

const list =
  (
    type: string,
    attrs: (match: RegExpExecArray) => Attrs,
    itemAttrs: (match: RegExpExecArray) => Attrs,
  ): Build =>
  (tr, pos, match) =>
    has(tr, type) && wrapInList(tr, pos, type, attrs(match), itemAttrs(match));

const none = (): Attrs => ({});

const ATOM = '￼';

const markRule = (match: RegExp, mark: string, size: number): InputRule => ({
  match,
  apply: (tr, found, from, to) => {
    const inner = found[1] ?? '';
    const { schema } = tr.doc;
    const parent = schema.nodes.get(tr.doc.resolve(from).parent.type);

    if (
      inner === '' ||
      inner.includes(ATOM) ||
      !schema.marks.has(mark) ||
      parent?.marks.has(mark) !== true
    ) {
      return false;
    }
    const end = from + inner.length;

    tr.delete(to - size, to)
      .delete(from, from + size)
      .addMark(from, end, schema.mark(mark));

    const before = tr.doc.resolve(end).nodeBefore;

    tr.setStoredMarks(
      before?.kind === ContentNodeKind.Text
        ? before.marks.filter((item) => item.type !== mark)
        : [],
    );

    return true;
  },
});

export const markdownRules: readonly InputRule[] = [
  blockRule(
    /^(#{1,6})\s$/,
    retype('heading', (match) => ({ level: match[1]?.length ?? 1 })),
  ),
  blockRule(
    /^```([\w#+.-]{1,32})?\s$/,
    retype('code_block', (match) =>
      match[1] === undefined ? {} : { language: match[1].toLowerCase() },
    ),
  ),
  blockRule(
    /^>\s$/,
    (tr, pos) => has(tr, 'blockquote') && wrapTextblock(tr, pos, [{ type: 'blockquote' }]),
  ),
  blockRule(/^[*-]\s$/, list('bullet_list', none, none)),
  blockRule(
    /^(\d{1,9})\.\s$/,
    list('ordered_list', (match) => ({ start: Number(match[1] ?? 1) }), none),
  ),
  blockRule(
    /^\[([ x]?)\]\s$/i,
    list('todo_list', none, (match) => ({
      checked: (match[1] ?? '').toLowerCase() === TaskMark.Done,
    })),
  ),
  blockRule(/^---$/, (tr, pos) => insertBeforeTextblock(tr, pos, 'divider')),
  markRule(/(?<![*\w])\*\*([^\s*](?:[^*]*[^\s*])?)\*\*$/, 'bold', 2),
  markRule(/(?<![*\w])\*([^\s*](?:[^*]*[^\s*])?)\*$/, 'italic', 1),
  markRule(/(?<![~\w])~~([^\s~](?:[^~]*[^\s~])?)~~$/, 'strike', 2),
  markRule(/(?<![`\w])`([^`]+)`$/, 'code', 1),
];
