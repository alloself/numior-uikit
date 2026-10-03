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
