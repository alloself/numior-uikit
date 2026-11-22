import {
  ContentNodeKind,
  type ContentNode,
  type ElementNode,
  type Mark,
  type Schema,
} from '@numior/editor-core';
import { XmlElement, XmlText } from 'yjs';
import { commonSpan } from './common-run';
import { attrsFrom, encodedAttrs, ID_ATTRIBUTE, isFields } from './values';
import { AtomKind, type Atom, type Fields, type Known, type ReadContext } from './yjs.types';

interface Units {
  readonly text: string;
  readonly keys: ReadonlyMap<number, string>;
}

const EMBED_UNIT = '￼';

const FOREIGN_KEY = '\u0000';

const NO_MARKS: readonly Mark[] = [];

const rawDelta = (line: XmlText): readonly unknown[] => {
  const delta: unknown = line.toDelta();

  return Array.isArray(delta) ? delta : [];
};

const deltaOf = (line: XmlText): readonly Fields[] => rawDelta(line).filter(isFields);

const embedKey = (type: string, id: unknown): string => `${type} ${String(id)}`;

const marksOf = (schema: Schema, format: unknown): readonly Mark[] | undefined => {
  if (!isFields(format)) {
    return NO_MARKS;
  }

  const marks: Mark[] = [];

  for (const type in format) {
    const attrs = attrsFrom(format[type]);

    if (attrs === undefined || !schema.marks.has(type)) {
      return undefined;
    }
    marks.push(schema.mark(type, attrs));
  }
  return marks;
};

const lineOfEmbed = (element: XmlElement): XmlText | undefined => {
  const [first] = element.toArray();

  return first instanceof XmlText ? first : undefined;
};

const embedNode = (context: ReadContext, element: XmlElement): ElementNode | undefined => {
  const known = context.known.get(element);

  if (known !== undefined) {
    return known;
  }

  const id: unknown = element.getAttribute(ID_ATTRIBUTE);
  const attrs = encodedAttrs(element.getAttributes());
  const type = context.schema.nodes.get(element.nodeName);
  const line = lineOfEmbed(element);
  const content = type?.leaf === false && line !== undefined ? lineContent(context, line) : [];

  if (
    typeof id !== 'string' ||
    attrs === undefined ||
    type === undefined ||
    content === undefined
  ) {
    return undefined;
  }

  const node = context.schema.element(element.nodeName, { id, attrs, content });

  context.known.set(element, node);
  return node;
};

const itemNode = (context: ReadContext, item: unknown): ContentNode | undefined => {
  if (!isFields(item)) {
    return undefined;
  }

  const { insert } = item;

  if (insert instanceof XmlElement) {
    return embedNode(context, insert);
  }
  if (typeof insert !== 'string') {
    return undefined;
  }

  const marks = marksOf(context.schema, item['attributes']);

  return marks === undefined ? undefined : context.schema.text(insert, marks);
};

export const lineContent = (context: ReadContext, line: XmlText): ContentNode[] | undefined => {
  const content: ContentNode[] = [];

  for (const item of rawDelta(line)) {
    const node = itemNode(context, item);

    if (node === undefined) {
      return undefined;
    }
    content.push(node);
  }
  return content;
};

export const embedsOf = (line: XmlText): readonly { element: XmlElement; at: number }[] => {
  const embeds: { element: XmlElement; at: number }[] = [];
  let at = 0;

  for (const item of deltaOf(line)) {
    const { insert } = item;

    if (insert instanceof XmlElement) {
      embeds.push({ element: insert, at });
    }
    at += typeof insert === 'string' ? insert.length : 1;
  }
  return embeds;
};

const currentAtoms = (line: XmlText): readonly Atom[] =>
  deltaOf(line).map((item): Atom => {
    const { insert } = item;
    const format = item['attributes'];

    if (typeof insert === 'string') {
      return { kind: AtomKind.Text, text: insert, format: isFields(format) ? format : {} };
    }
    return insert instanceof XmlElement
      ? {
          kind: AtomKind.Embed,
          key: embedKey(insert.nodeName, insert.getAttribute(ID_ATTRIBUTE)),
          element: insert,
        }
      : { kind: AtomKind.Embed, key: FOREIGN_KEY };
  });

const formatOf = (marks: readonly Mark[]): Fields =>
  Object.fromEntries(marks.map((mark) => [mark.type, mark.attrs]));

const wantedAtoms = (content: readonly ContentNode[]): readonly Atom[] =>
  content.map((node): Atom =>
    node.kind === ContentNodeKind.Text
      ? { kind: AtomKind.Text, text: node.text, format: formatOf(node.marks) }
      : { kind: AtomKind.Embed, key: embedKey(node.type, node.id) },
  );

const atomLength = (atom: Atom): number => (atom.kind === AtomKind.Text ? atom.text.length : 1);

const unitsOf = (atoms: readonly Atom[]): Units => {
  const keys = new Map<number, string>();
  let text = '';

  for (const atom of atoms) {
    if (atom.kind === AtomKind.Text) {
      text += atom.text;
      continue;
    }
    keys.set(text.length, atom.key);
    text += EMBED_UNIT;
  }
  return { text, keys };
};

const sortedEntries = (format: Fields): readonly (readonly [string, unknown])[] =>
  Object.entries(format).toSorted(([left], [right]) => left.localeCompare(right));

const sameFormat = (left: Fields, right: Fields): boolean =>
  JSON.stringify(sortedEntries(left)) === JSON.stringify(sortedEntries(right));

const endsOf = (atoms: readonly Atom[]): readonly number[] => {
  let offset = 0;

  return atoms.map((atom) => {
    offset += atomLength(atom);
    return offset;
  });
};

const formatAt = (atoms: readonly Atom[], ends: readonly number[], position: number): Fields => {
  const atom = atoms[ends.findIndex((end) => position < end)];

  return atom?.kind === AtomKind.Text ? atom.format : {};
};

const formatPatch = (current: Fields, next: Fields): Fields => ({
  ...Object.fromEntries(Object.keys(current).map((type) => [type, null])),
  ...next,
});

const reformat = (line: XmlText, wanted: readonly Atom[]): void => {
  const items = deltaOf(line);

  const current = items.map((item): Atom => {
    const { insert } = item;
    const format = isFields(item['attributes']) ? item['attributes'] : {};

    return typeof insert === 'string'
      ? { kind: AtomKind.Text, text: insert, format }
      : { kind: AtomKind.Text, text: EMBED_UNIT, format };
  });

  const currentEnds = endsOf(current);
  const wantedEnds = endsOf(wanted);
  const cuts = Array.from(new Set([0, ...currentEnds, ...wantedEnds])).toSorted((a, b) => a - b);

  cuts.slice(0, -1).forEach((start, index) => {
    const before = formatAt(current, currentEnds, start);
    const after = formatAt(wanted, wantedEnds, start);

    if (sameFormat(before, after)) {
      return;
    }
    line.format(start, (cuts[index + 1] ?? start) - start, formatPatch(before, after));
  });
};

const fillEmbed = (known: Known, element: XmlElement, node: ElementNode): void => {
  if (known.get(element) === node) {
    return;
  }

  const attributes = element.getAttributes();

  for (const key of Object.keys(attributes)) {
    if (key === ID_ATTRIBUTE || Object.hasOwn(node.attrs, key)) {
      continue;
    }
    element.removeAttribute(key);
  }
  for (const [key, value] of Object.entries(node.attrs)) {
    const encoded = JSON.stringify(value);

    if (attributes[key] === encoded) {
      continue;
    }
    element.setAttribute(key, encoded);
  }
  if (!node.leaf) {
    const line = lineOfEmbed(element) ?? new XmlText();

    if (line.parent === null) {
      element.insert(0, [line]);
    }
    writeLine(known, line, node.content);
  }
  known.set(element, node);
};

const insertMiddle = (
  known: Known,
  line: XmlText,
  content: readonly ContentNode[],
  from: number,
  to: number,
): void => {
  let offset = 0;

  for (const node of content) {
    if (node.kind === ContentNodeKind.Element) {
      if (offset >= from && offset < to) {
        const element = new XmlElement(node.type);

        line.insertEmbed(offset, element, {});
        element.setAttribute(ID_ATTRIBUTE, node.id);
        fillEmbed(known, element, node);
      }
      offset += 1;
      continue;
    }

    const start = Math.max(from, offset);
    const end = Math.min(to, offset + node.text.length);

    if (start < end) {
      line.insert(start, node.text.slice(start - offset, end - offset), {
        ...formatOf(node.marks),
      });
    }
    offset += node.text.length;
  }
};

const elementsAt = (content: readonly ContentNode[]): ReadonlyMap<number, ElementNode> => {
  const elements = new Map<number, ElementNode>();
  let offset = 0;

  for (const node of content) {
    if (node.kind === ContentNodeKind.Element) {
      elements.set(offset, node);
    }
    offset += node.kind === ContentNodeKind.Element ? 1 : node.text.length;
  }
  return elements;
};

const refreshKept = (
  known: Known,
  current: readonly Atom[],
  content: readonly ContentNode[],
  kept: {
    readonly head: number;
    readonly tail: number;
    readonly shift: number;
    readonly end: number;
  },
): void => {
  const wanted = elementsAt(content);
  let offset = 0;

  for (const atom of current) {
    const at = offset;

    offset += atomLength(atom);

    if (atom.kind !== AtomKind.Embed || atom.element === undefined) {
      continue;
    }

    const target = at < kept.head ? at : at + kept.shift;
    const node = at < kept.head || at >= kept.end - kept.tail ? wanted.get(target) : undefined;

    if (node === undefined) {
      continue;
    }
    fillEmbed(known, atom.element, node);
  }
};

export const writeLine = (known: Known, line: XmlText, content: readonly ContentNode[]): void => {
  const current = currentAtoms(line);
  const wanted = wantedAtoms(content);
  const before = unitsOf(current);
  const after = unitsOf(wanted);

  const { head, tail } = commonSpan(
    before.text,
    after.text,
    (left, right) =>
      before.text[left] === after.text[right] && before.keys.get(left) === after.keys.get(right),
  );

  const removed = before.text.length - head - tail;

  refreshKept(known, current, content, {
    head,
    tail,
    shift: after.text.length - before.text.length,
    end: before.text.length,
  });

  if (removed > 0) {
    line.delete(head, removed);
  }
  insertMiddle(known, line, content, head, after.text.length - tail);
  reformat(line, wanted);
};
