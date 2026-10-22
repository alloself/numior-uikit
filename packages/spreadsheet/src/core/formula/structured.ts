import type {
  FormulaLocale,
  FormulaNode,
  StructuredArea,
  StructuredColumns,
  StructuredSpecial,
} from './formula.types';
import { EN_FORMULAS } from './locale';

export type StructuredNode = Extract<FormulaNode, { readonly kind: 'structured' }>;

type Part =
  | { readonly kind: 'special'; readonly special: StructuredSpecial }
  | { readonly kind: 'columns'; readonly columns: StructuredColumns };

interface Body {
  readonly area: StructuredArea;
  readonly columns?: StructuredColumns | undefined;
}

const SPECIALS: readonly StructuredSpecial[] = ['all', 'data', 'headers', 'totals', 'row'];

const AREAS: Readonly<Record<string, StructuredArea>> = {
  '': 'data',
  all: 'all',
  data: 'data',
  headers: 'headers',
  totals: 'totals',
  'data,headers': 'headers-data',
  'data,totals': 'data-totals',
  row: 'row',
};

const AREA_SPECIALS: Readonly<Record<StructuredArea, readonly StructuredSpecial[]>> = {
  data: [],
  all: ['all'],
  headers: ['headers'],
  totals: ['totals'],
  'headers-data': ['headers', 'data'],
  'data-totals': ['data', 'totals'],
  row: ['row'],
};

const ESCAPED = /[[\]#']/gu;

const NEEDS_BRACKETS = /[\t\n\r,:.[\]#'"{}$^&*+=\-<>/;@!]|^\s|\s$/u;

const escaped = (name: string): string => name.replaceAll(ESCAPED, "'$&");

const unescaped = (text: string): string => text.replaceAll(/'(.)/gu, '$1');

const specialOf = (text: string, locale: FormulaLocale): StructuredSpecial | undefined => {
  const wanted = text.trim().toLowerCase();

  return SPECIALS.find(
    (special) =>
      locale.specials[special].toLowerCase() === wanted ||
      EN_FORMULAS.specials[special].toLowerCase() === wanted,
  );
};

const closeOf = (text: string, at: number): number | undefined => {
  for (let index = at + 1; index < text.length; index += 1) {
    const char = text[index];

    if (char === "'") {
      index += 1;
    } else if (char === ']') {
      return index;
    } else if (char === '[') {
      return undefined;
    }
  }
  return undefined;
};

const skipSpaces = (text: string, at: number): number => {
  let index = at;

  while (text[index] === ' ') {
    index += 1;
  }
  return index;
};

const bracketAt = (text: string, at: number): { item: string; next: number } | undefined => {
  const start = skipSpaces(text, at);
  const close = text[start] === '[' ? closeOf(text, start) : undefined;

  return close === undefined
    ? undefined
    : { item: text.slice(start + 1, close), next: skipSpaces(text, close + 1) };
};

const partAt = (
  text: string,
  at: number,
  locale: FormulaLocale,
): { part: Part; next: number } | undefined => {
  const first = bracketAt(text, at);

  if (first === undefined) {
    return undefined;
  }
  if (first.item.startsWith('#')) {
    const special = specialOf(first.item, locale);

    return special === undefined
      ? undefined
      : { part: { kind: 'special', special }, next: first.next };
  }

  const from = unescaped(first.item);
  const second = text[first.next] === ':' ? bracketAt(text, first.next + 1) : undefined;

  if (text[first.next] === ':' && second === undefined) {
    return undefined;
  }
  return {
    part: {
      kind: 'columns',
      columns: { from, to: second === undefined ? from : unescaped(second.item) },
    },
    next: second?.next ?? first.next,
  };
};

const partsOf = (text: string, locale: FormulaLocale): Part[] | undefined => {
  const parts: Part[] = [];
  let at = 0;

  while (at < text.length) {
    const found = partAt(text, at, locale);

    if (found === undefined) {
      return undefined;
    }
    parts.push(found.part);

    const separator = text[found.next];

    if (found.next < text.length && separator !== locale.argument && separator !== ',') {
      return undefined;
    }
    at = found.next + 1;
  }
  return parts;
};

const bodyOf = (parts: readonly Part[]): Body | undefined => {
  const specials = parts.reduce<StructuredSpecial[]>((found, part) => {
    if (part.kind === 'special') {
      found.push(part.special);
    }
    return found;
  }, []);

  const columns = parts.reduce<StructuredColumns[]>((found, part) => {
    if (part.kind === 'columns') {
      found.push(part.columns);
    }
    return found;
  }, []);

  const area = AREAS[specials.toSorted().join(',')];

  return area === undefined || columns.length > 1 ? undefined : { area, columns: columns[0] };
};

const rowBody = (rest: string, locale: FormulaLocale): Body | undefined => {
  if (rest === '') {
    return { area: 'row' };
  }
  if (!rest.startsWith('[')) {
    return { area: 'row', columns: { from: unescaped(rest), to: unescaped(rest) } };
  }

  const parts = partsOf(rest, locale);
  const only = parts?.length === 1 ? parts[0] : undefined;

  return only?.kind === 'columns' ? { area: 'row', columns: only.columns } : undefined;
};

const innerBody = (inner: string, locale: FormulaLocale): Body | undefined => {
  const text = inner.trim();

  if (text === '') {
    return { area: 'data' };
  }
  if (text.startsWith('@')) {
    return rowBody(text.slice(1).trim(), locale);
  }
  if (text.startsWith('#')) {
    const special = specialOf(text, locale);

    return special === undefined ? undefined : bodyOf([{ kind: 'special', special }]);
  }
  if (text.startsWith('[')) {
    const parts = partsOf(text, locale);

    return parts === undefined ? undefined : bodyOf(parts);
  }

  const name = unescaped(text);

  return { area: 'data', columns: { from: name, to: name } };
};

export const parseStructured = (
  text: string,
  locale: FormulaLocale,
): StructuredNode | undefined => {
  const open = text.indexOf('[');
  const body = innerBody(text.slice(open + 1, -1), locale);

  if (body === undefined) {
    return undefined;
  }
  return {
    kind: 'structured',
    table: open === 0 ? undefined : text.slice(0, open),
    area: body.area,
    columns: body.columns,
  };
};

const simple = (columns: StructuredColumns): boolean =>
  columns.from === columns.to && !NEEDS_BRACKETS.test(columns.from) && columns.from !== '';

const bracketed = (columns: StructuredColumns): string =>
  columns.from === columns.to
    ? `[${escaped(columns.from)}]`
    : `[${escaped(columns.from)}]:[${escaped(columns.to)}]`;

const innerText = (node: StructuredNode, locale: FormulaLocale): string => {
  const { columns } = node;

  if (node.area === 'row' && locale.rowShorthand) {
    if (columns === undefined) {
      return '@';
    }
    return simple(columns) && !/\s/u.test(columns.from)
      ? `@${columns.from}`
      : `@${bracketed(columns)}`;
  }

  const specials = AREA_SPECIALS[node.area].map((special) => locale.specials[special]);

  if (columns === undefined) {
    return specials.length === 1
      ? (specials[0] ?? '')
      : specials.map((special) => `[${special}]`).join(locale.argument);
  }
  if (specials.length === 0) {
    return simple(columns) ? columns.from : bracketed(columns);
  }
  return [...specials.map((special) => `[${special}]`), bracketed(columns)].join(locale.argument);
};

export const printStructured = (node: StructuredNode, locale: FormulaLocale): string =>
  `${node.table ?? ''}[${innerText(node, locale)}]`;
