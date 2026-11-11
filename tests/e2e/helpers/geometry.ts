import type { Locator } from '@playwright/test';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PseudoBox {
  readonly opacity: number;
  readonly width: number;
  readonly height: number;
}

export interface FillInsets {
  readonly top: number;
  readonly bottom: number;
}

export const boxOf = async (target: Locator): Promise<Box> => {
  const box = await target.boundingBox();

  if (!box) {
    throw new Error('Element has no bounding box');
  }
  return box;
};

export const CELL_TEXT =
  ':scope > .nui-table__content--text, :scope > .nui-table__content > .nui-table__text';

export const textBoxOf = (target: Locator): Promise<Box> =>
  target.evaluate((element) => {
    const range = document.createRange();

    range.selectNodeContents(element);

    const { x, y, width, height } = element.classList.contains('nui-table__content--text')
      ? range.getBoundingClientRect()
      : element.getBoundingClientRect();

    return { x, y, width, height };
  });

export const rowFillInsets = (row: Locator): Promise<FillInsets> =>
  row.evaluate((element) => {
    const inner = element.querySelector('.nui-list-item__inner');

    if (inner === null) {
      throw new Error('Row has no inner part');
    }

    const style = getComputedStyle(element);
    const divider = style.backgroundClip === 'padding-box' ? parseFloat(style.borderTopWidth) : 0;
    const fill = element.getBoundingClientRect();
    const content = inner.getBoundingClientRect();

    return { top: content.top - fill.top - divider, bottom: fill.bottom - content.bottom };
  });

export const renderedWidth = async (target: Locator): Promise<number> =>
  (await target.boundingBox())?.width ?? 0;

export const spanBox = async (first: Locator, last: Locator): Promise<Box> => {
  const [a, b] = await Promise.all([boxOf(first), boxOf(last)]);
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);

  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
};

export const boxGaps = (box: Box, other: Box): number[] =>
  [box.x - other.x, box.y - other.y, box.width - other.width, box.height - other.height].map(
    (gap) => Math.round(Math.abs(gap)),
  );

export const beforeBoxOf = (target: Locator, host?: string): Promise<PseudoBox> =>
  target.evaluate((element, selector) => {
    const owner = selector === undefined ? element : (element.closest(selector) ?? element);
    const style = getComputedStyle(owner, '::before');

    return {
      opacity: Number(style.opacity),
      width: Number.parseFloat(style.width),
      height: Number.parseFloat(style.height),
    };
  }, host);
