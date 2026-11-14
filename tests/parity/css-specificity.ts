import type { Specificity } from './css-rules.types.ts';

const ZERO: Specificity = [0, 0, 0];
const MATCHES_ANY = new Set([':not', ':is', ':has', ':matches']);
const NAME = /^[\w-]/;

export const splitSelectors = (list: string): string[] => {
  const parts: string[] = [];
  let [depth, current] = [0, ''];

  for (const char of list) {
    depth += Number(char === '(') - Number(char === ')');

    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  parts.push(current.trim());

  return parts;
};

const add = (left: Specificity, right: Specificity): Specificity => [
  left[0] + right[0],
  left[1] + right[1],
  left[2] + right[2],
];

export const compareSpecificity = (left: Specificity, right: Specificity): number =>
  left[0] - right[0] || left[1] - right[1] || left[2] - right[2];

const closing = (selector: string, open: number): number => {
  let depth = 0;

  for (let at = open; at < selector.length; at += 1) {
    depth += Number(selector[at] === '(') - Number(selector[at] === ')');

    if (depth === 0) {
      return at;
    }
  }

  return selector.length - 1;
};

const nameEnd = (selector: string, from: number): number => {
  let at = from;

  while (at < selector.length && NAME.test(selector[at] ?? '')) {
    at += 1;
  }

  return at;
};

const strongest = (list: string): Specificity =>
  splitSelectors(list).reduce<Specificity>((best, selector) => {
    const next = specificity(selector);

    return compareSpecificity(next, best) > 0 ? next : best;
  }, ZERO);

const pseudo = (selector: string, at: number): [Specificity, number] => {
  const element = selector[at + 1] === ':';
  const start = at + (element ? 2 : 1);
  const end = nameEnd(selector, start);
  const name = `:${selector.slice(start, end)}`;

  if (selector[end] !== '(') {
    return [element ? [0, 0, 1] : [0, 1, 0], end];
  }

  const close = closing(selector, end);
  const inner = selector.slice(end + 1, close);

  if (name === ':where') {
    return [ZERO, close + 1];
  }

  return [MATCHES_ANY.has(name) ? strongest(inner) : [0, 1, 0], close + 1];
};

const part = (selector: string, at: number): [Specificity, number] => {
  const char = selector[at] ?? '';

  if (char === ':') {
    return pseudo(selector, at);
  }

  if (char === '[') {
    return [[0, 1, 0], selector.indexOf(']', at) + 1];
  }

  if (char === '#' || char === '.') {
    return [char === '#' ? [1, 0, 0] : [0, 1, 0], nameEnd(selector, at + 1)];
  }

  return NAME.test(char) ? [[0, 0, 1], nameEnd(selector, at)] : [ZERO, at + 1];
};

export const specificity = (selector: string): Specificity => {
  let [total, at] = [ZERO, 0];

  while (at < selector.length) {
    const [weight, next] = part(selector, at);

    total = add(total, weight);
    at = next;
  }

  return total;
};

export const listSpecificity = (list: string): readonly Specificity[] =>
  splitSelectors(list).map(specificity);
