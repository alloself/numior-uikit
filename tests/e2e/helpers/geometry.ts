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
