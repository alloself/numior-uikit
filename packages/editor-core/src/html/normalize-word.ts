import { htmlElement } from './element';
import { PasteMarker, type HtmlElement, type HtmlNode } from './html.types';
import { isBlank, isElement, renamed, rewriteTree, type ChildrenRewrite } from './rewrite';

interface WordItem {
  readonly level: number;
  readonly tag: 'ul' | 'ol';
  readonly start: number | undefined;
  readonly paragraph: HtmlElement;
}

interface ItemDraft {
  readonly paragraph: HtmlElement;
  readonly lists: ListDraft[];
}

interface ListDraft {
  readonly tag: 'ul' | 'ol';
  readonly start: number | undefined;
  readonly level: number;
  readonly items: ItemDraft[];
}

interface Marker {
  readonly tag: 'ul' | 'ol';
  readonly start: number | undefined;
}

const LEVEL = /^l\d+\s+level(\d+)/iu;

const SHAPE = /^\(?(?:[\da-z]+\.)*([\da-z]+)([.)]?)$/iu;

const DIGITS = /^\d+$/u;

const LETTERED = /^(?:[a-z]{1,3}|[ivxlcdm]+)$/iu;

const ROMAN = /^[ivx]+$/iu;

const REPEATED = /^([a-z])\1{0,2}$/iu;

const ALPHABET = 26;

const BEFORE_A = 'a'.charCodeAt(0) - 1;

const BULLET: Marker = { tag: 'ul', start: undefined };

const ROMAN_DIGITS: ReadonlyMap<string, number> = new Map([
  ['i', 1],
  ['v', 5],
  ['x', 10],
]);

const TITLES: ReadonlyMap<string, string> = new Map([
  ['MsoTitle', 'h1'],
  ['MsoSubtitle', 'h2'],
]);

const isMarker = (node: HtmlNode): boolean =>
  isElement(node) && node.style('mso-list')?.toLowerCase() === PasteMarker.Ignore;

const markerIn = (nodes: readonly HtmlNode[]): HtmlElement | undefined => {
  for (const node of nodes) {
    if (isElement(node)) {
      const found = isMarker(node) ? node : markerIn(node.children);

      if (found !== undefined) {
        return found;
      }
    }
  }
  return undefined;
};

const withoutMarkers = (paragraph: HtmlElement): HtmlElement =>
  rewriteTree(paragraph, (children) => children.filter((child) => !isMarker(child)));

const romanCount = (text: string): number =>
  text.split('').reduce((total, letter, index, letters) => {
    const value = ROMAN_DIGITS.get(letter) ?? 0;
    const next = ROMAN_DIGITS.get(letters[index + 1] ?? '') ?? 0;

    return value < next ? total - value : total + value;
  }, 0);

const letterCount = (text: string): number | undefined =>
  REPEATED.test(text) ? (text.length - 1) * ALPHABET + text.charCodeAt(0) - BEFORE_A : undefined;

const markerOf = (text: string): Marker => {
  const [, last, end] = SHAPE.exec(text.toLowerCase()) ?? [];

  if (last === undefined) {
    return BULLET;
  }

  if (DIGITS.test(last)) {
    return { tag: 'ol', start: Number(last) };
  }

  if (end === '' || !LETTERED.test(last)) {
    return BULLET;
  }
  return { tag: 'ol', start: ROMAN.test(last) ? romanCount(last) : letterCount(last) };
};

const itemOf = (node: HtmlNode): WordItem | undefined => {
  const level = isElement(node, 'p') ? LEVEL.exec(node.style('mso-list') ?? '')?.[1] : undefined;

  if (!isElement(node) || level === undefined) {
    return undefined;
  }
  return {
    level: Number(level),
    ...markerOf((markerIn(node.children)?.text() ?? '').replaceAll(/\s/gu, '')),
    paragraph: withoutMarkers(node),
  };
};

const draftOf = (item: WordItem): ListDraft => ({
  tag: item.tag,
  start: item.start,
  level: item.level,
  items: [],
});

const attach = (stack: ListDraft[], roots: ListDraft[], list: ListDraft): void => {
  const parent = stack.at(-1)?.items.at(-1);

  if (parent === undefined) {
    roots.push(list);
  } else {
    parent.lists.push(list);
  }
  stack.push(list);
};

const place = (stack: ListDraft[], roots: ListDraft[], item: WordItem): ListDraft => {
  while ((stack.at(-1)?.level ?? 0) > item.level) {
    stack.pop();
  }
  const top = stack.at(-1);

  if (top !== undefined && top.level === item.level && top.tag !== item.tag) {
    stack.pop();
  }
  const current = stack.at(-1);

  if (current === undefined || current.level < item.level) {
    attach(stack, roots, draftOf(item));
  }
  return stack.at(-1) ?? draftOf(item);
};

const listElement = (list: ListDraft): HtmlElement =>
  htmlElement(
    list.tag,
    new Map(list.start === undefined || list.start === 1 ? [] : [['start', String(list.start)]]),
    list.items.map((item) =>
      htmlElement('li', new Map(), [item.paragraph, ...item.lists.map(listElement)]),
    ),
  );

const buildLists = (items: readonly WordItem[]): HtmlElement[] => {
  const roots: ListDraft[] = [];
  const stack: ListDraft[] = [];

  for (const item of items) {
    place(stack, roots, item).items.push({ paragraph: item.paragraph, lists: [] });
  }
  return roots.map(listElement);
};

const wordLists: ChildrenRewrite = (children) => {
  const result: HtmlNode[] = [];
  let run: WordItem[] = [];

  for (const child of children) {
    const item = itemOf(child);

    if (item !== undefined) {
      run.push(item);
    } else if (!(isBlank(child) && run.length > 0)) {
      result.push(...buildLists(run), child);
      run = [];
    }
  }
  return [...result, ...buildLists(run)];
};

const isEmptyParagraph = (node: HtmlNode): boolean =>
  isElement(node, 'p') &&
  node.text().trim() === '' &&
  node.find('img') === undefined &&
  node.find('br') === undefined;

const titled = (node: HtmlNode): HtmlNode => {
  const tag = isElement(node, 'p')
    ? [...TITLES].find(([name]) => node.hasClass(name))?.[1]
    : undefined;

  return isElement(node) && tag !== undefined ? renamed(node, tag) : node;
};

const wordBlocks: ChildrenRewrite = (children, parent) =>
  wordLists(
    children.reduce<HtmlNode[]>((found, child) => {
      if (!isEmptyParagraph(child)) {
        found.push(titled(child));
      }
      return found;
    }, []),
    parent,
  );

export const normalizeWord = (root: HtmlElement): HtmlElement => rewriteTree(root, wordBlocks);
