import {
  ContentNodeKind,
  type ContentNode,
  type ElementNode,
  type Mark,
  type TextNode,
} from '@numior/editor-core';
import { XmlElement, XmlText, type XmlFragment } from 'yjs';
import { commonRun, commonText } from './common-run';
import { deltaRuns, ID_ATTRIBUTE, type DeltaRun } from './from-yjs';

type Wanted =
  | { readonly kind: typeof ContentNodeKind.Text; readonly runs: readonly TextNode[] }
  | { readonly kind: typeof ContentNodeKind.Element; readonly node: ElementNode };

type YChild = ReturnType<XmlFragment['toArray']>[number];

type Known = WeakMap<XmlElement, ElementNode>;

const groupsOf = (content: readonly ContentNode[]): readonly Wanted[] =>
  content.reduce<Wanted[]>((groups, node) => {
    const last = groups.at(-1);

    if (node.kind === ContentNodeKind.Element) {
      groups.push({ kind: ContentNodeKind.Element, node });
    } else if (last?.kind === ContentNodeKind.Text) {
      groups[groups.length - 1] = { kind: ContentNodeKind.Text, runs: [...last.runs, node] };
    } else {
      groups.push({ kind: ContentNodeKind.Text, runs: [node] });
    }
    return groups;
  }, []);

const matches = (child: YChild | undefined, wanted: Wanted | undefined): boolean => {
  if (wanted?.kind === ContentNodeKind.Text) {
    return child instanceof XmlText;
  }
  return (
    wanted !== undefined &&
    child instanceof XmlElement &&
    child.nodeName === wanted.node.type &&
    child.getAttribute(ID_ATTRIBUTE) === wanted.node.id
  );
};

const formatOf = (marks: readonly Mark[]): Record<string, unknown> =>
  Object.fromEntries(marks.map((mark) => [mark.type, mark.attrs]));

const sortedEntries = (format: DeltaRun['format']): readonly (readonly [string, unknown])[] =>
  Object.entries(format).toSorted(([left], [right]) => left.localeCompare(right));

const sameFormat = (left: DeltaRun['format'], right: DeltaRun['format']): boolean =>
  JSON.stringify(sortedEntries(left)) === JSON.stringify(sortedEntries(right));

const boundariesOf = (runs: readonly { readonly text: string }[]): readonly number[] => {
  let offset = 0;

  return runs.map((run) => {
    offset += run.text.length;
    return offset;
  });
};

const formatAt = (
  runs: readonly DeltaRun[],
  ends: readonly number[],
  position: number,
): DeltaRun['format'] => runs[ends.findIndex((end) => position < end)]?.format ?? {};

const formatPatch = (
  current: DeltaRun['format'],
  next: DeltaRun['format'],
): Record<string, unknown> => ({
  ...Object.fromEntries(Object.keys(current).map((type) => [type, null])),
  ...next,
});

const reformat = (text: XmlText, wanted: readonly DeltaRun[]): void => {
  const current = deltaRuns(text);
  const currentEnds = boundariesOf(current);
  const wantedEnds = boundariesOf(wanted);
  const cuts = Array.from(new Set([0, ...currentEnds, ...wantedEnds])).toSorted((a, b) => a - b);

  cuts.slice(0, -1).forEach((start, index) => {
    const before = formatAt(current, currentEnds, start);
    const after = formatAt(wanted, wantedEnds, start);

    if (!sameFormat(before, after)) {
      text.format(start, (cuts[index + 1] ?? start) - start, formatPatch(before, after));
    }
  });
};

const insertRuns = (text: XmlText, runs: readonly DeltaRun[], from: number, to: number): void => {
  let offset = 0;

  runs.forEach((run) => {
    const start = Math.max(from, offset);
    const end = Math.min(to, offset + run.text.length);

    if (start < end) {
      text.insert(start, run.text.slice(start - offset, end - offset), { ...run.format });
    }
    offset += run.text.length;
  });
};

const updateText = (text: XmlText, runs: readonly TextNode[]): void => {
  const before = deltaRuns(text)
    .map((run) => run.text)
    .join('');

  const after = runs.map((run) => run.text).join('');
  const { head, tail } = commonText(before, after);
  const wanted = runs.map((run) => ({ text: run.text, format: formatOf(run.marks) }));

  if (before.length - head - tail > 0) {
    text.delete(head, before.length - head - tail);
  }

  insertRuns(text, wanted, head, after.length - tail);
  reformat(text, wanted);
};

const updateElement = (known: Known, element: XmlElement, node: ElementNode): void => {
  if (known.get(element) === node) {
    return;
  }

  const stale = Object.keys(element.getAttributes()).filter(
    (key) => key !== ID_ATTRIBUTE && !Object.hasOwn(node.attrs, key),
  );

  stale.forEach((key) => {
    element.removeAttribute(key);
  });

  Object.entries(node.attrs).forEach(([key, value]) => {
    const encoded = JSON.stringify(value);

    if (element.getAttribute(key) !== encoded) {
      element.setAttribute(key, encoded);
    }
  });

  syncChildren(known, element, node.content);
  known.set(element, node);
};

const created = (known: Known, parent: XmlFragment, at: number, wanted: Wanted): void => {
  if (wanted.kind === ContentNodeKind.Text) {
    const text = new XmlText();

    parent.insert(at, [text]);
    updateText(text, wanted.runs);
    return;
  }

  const element = new XmlElement(wanted.node.type);

  parent.insert(at, [element]);
  element.setAttribute(ID_ATTRIBUTE, wanted.node.id);
  updateElement(known, element, wanted.node);
};

const updated = (known: Known, child: YChild | undefined, wanted: Wanted | undefined): void => {
  if (wanted?.kind === ContentNodeKind.Text && child instanceof XmlText) {
    updateText(child, wanted.runs);
  } else if (wanted?.kind === ContentNodeKind.Element && child instanceof XmlElement) {
    updateElement(known, child, wanted.node);
  }
};

export const syncChildren = (
  known: Known,
  parent: XmlFragment,
  content: readonly ContentNode[],
): void => {
  const current = parent.toArray();
  const wanted = groupsOf(content);
  const limit = Math.min(current.length, wanted.length);
  const head = commonRun(limit, (index) => matches(current[index], wanted[index]));

  const tail = commonRun(limit - head, (index) =>
    matches(current[current.length - 1 - index], wanted[wanted.length - 1 - index]),
  );

  current.slice(0, head).forEach((child, index) => {
    updated(known, child, wanted[index]);
  });

  current.slice(current.length - tail).forEach((child, index) => {
    updated(known, child, wanted[wanted.length - tail + index]);
  });

  if (current.length - head - tail > 0) {
    parent.delete(head, current.length - head - tail);
  }

  wanted.slice(head, wanted.length - tail).forEach((item, index) => {
    created(known, parent, head + index, item);
  });
};
