import { FOCUSABLE } from '../form-field/focus-control';

export { FOCUSABLE };

export type RowPart = 'control' | 'grip';

export type RowFocus =
  | { readonly kind: 'row'; readonly key: string; readonly part: RowPart }
  | { readonly kind: 'add' };

export interface Grab {
  readonly offset: number;
  readonly height: number;
}

const ROWS =
  ':scope > .nui-field-array__rows > .nui-field-array__row:not(.nui-field-array__row--leaving)';

const isElement = (node: Element): node is HTMLElement => node instanceof HTMLElement;

export const rowsOf = (list: HTMLElement | null | undefined): HTMLElement[] =>
  Array.from(list?.querySelectorAll(ROWS) ?? []).filter(isElement);

export const targetIndex = (rows: readonly HTMLElement[], from: number, client: number): number => {
  const passed = rows.filter((row, index) => {
    const rect = row.getBoundingClientRect();
    return index !== from && rect.top + rect.height / 2 < client;
  }).length;

  return Math.min(rows.length - 1, passed);
};

const halfGap = (element: Element | null): number =>
  element ? (Number.parseFloat(getComputedStyle(element).rowGap) || 0) / 2 : 0;

export const indicatorOffset = (list: HTMLElement, from: number, to: number): number => {
  const target = rowsOf(list)[to];

  if (!target) {
    return 0;
  }

  const rect = target.getBoundingClientRect();
  const half = halfGap(target.parentElement);
  const edge = to > from ? rect.bottom + half : rect.top - half;

  return edge - list.getBoundingClientRect().top;
};

export const ghostOffset = (list: HTMLElement, pointer: number, grab: Grab): number => {
  const rect = list.getBoundingClientRect();
  return Math.min(
    Math.max(0, pointer - grab.offset - rect.top),
    Math.max(0, rect.height - grab.height),
  );
};

export const focusRow = (row: Element | null | undefined, part: RowPart): void => {
  const element =
    part === 'grip'
      ? row?.querySelector('.nui-field-array__grip')
      : row?.querySelector('.nui-field-array__content')?.querySelector(FOCUSABLE);

  if (element instanceof HTMLElement) {
    element.focus();
  }
};
