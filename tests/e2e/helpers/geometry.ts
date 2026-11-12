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

export const boxOf = async (target: Locator): Promise<Box> => {
  const box = await target.boundingBox();

  if (!box) {
    throw new Error('Element has no bounding box');
  }
  return box;
};

export const gapBetween = async (trigger: Locator, surface: Locator): Promise<number> => {
  const [from, to] = await Promise.all([boxOf(trigger), boxOf(surface)]);

  return Math.round(Math.max(to.y - (from.y + from.height), from.y - (to.y + to.height)));
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

export const renderedWidth = async (target: Locator): Promise<number> =>
  (await target.boundingBox())?.width ?? 0;

export const renderedHeight = async (target: Locator): Promise<number> =>
  (await target.boundingBox())?.height ?? 0;

export const dragBy = async (handle: Locator, dx: number, dy: number): Promise<void> => {
  const { mouse } = handle.page();
  const box = await boxOf(handle);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await mouse.move(x, y);
  await mouse.down();
  await mouse.move(x + dx / 2, y + dy / 2);
  await mouse.move(x + dx, y + dy, { steps: 4 });
  await mouse.up();
};

export const dragAcross = (handle: Locator, dx: number): Promise<void> => dragBy(handle, dx, 0);

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
