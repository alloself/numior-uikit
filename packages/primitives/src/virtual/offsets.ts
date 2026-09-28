import { clamp } from '@vueuse/core';
import type { SizeIndex } from './size-index';

export type SizeModel =
  | { readonly kind: 'fixed'; readonly size: number; readonly count: number }
  | { readonly kind: 'variable'; readonly offsets: readonly number[] }
  | { readonly kind: 'indexed'; readonly index: SizeIndex; readonly revision: number };

export type ItemSize = number | ((index: number) => number) | SizeIndex;

export interface VirtualRange {
  readonly start: number;
  readonly end: number;
}

export type VirtualAlign = 'auto' | 'start' | 'center' | 'end';

const isSizeIndex = (value: ItemSize): value is SizeIndex => typeof value === 'object';

export const buildSizeModel = (count: number, itemSize: ItemSize): SizeModel => {
  const total = Math.max(0, Math.floor(count));

  if (typeof itemSize === 'number') {
    return { kind: 'fixed', size: itemSize, count: total };
  }
  if (isSizeIndex(itemSize)) {
    return { kind: 'indexed', index: itemSize, revision: itemSize.revision() };
  }
  const offsets = [0];
  let sum = 0;

  for (let index = 0; index < total; index += 1) {
    sum += itemSize(index);
    offsets.push(sum);
  }
  return { kind: 'variable', offsets };
};

export const countOf = (model: SizeModel): number => {
  switch (model.kind) {
    case 'fixed':
      return model.count;
    case 'variable':
      return model.offsets.length - 1;
    case 'indexed':
      return model.index.count;
  }
};

export const totalSizeOf = (model: SizeModel): number => {
  switch (model.kind) {
    case 'fixed':
      return model.size * model.count;
    case 'variable':
      return model.offsets.at(-1) ?? 0;
    case 'indexed':
      return model.index.total();
  }
};

export const offsetAt = (model: SizeModel, index: number): number => {
  const bounded = clamp(index, 0, countOf(model));

  switch (model.kind) {
    case 'fixed':
      return bounded * model.size;
    case 'variable':
      return model.offsets[bounded] ?? 0;
    case 'indexed':
      return model.index.offsetAt(bounded);
  }
};

export const sizeAt = (model: SizeModel, index: number): number => {
  switch (model.kind) {
    case 'fixed':
      return model.size;
    case 'variable':
      return offsetAt(model, index + 1) - offsetAt(model, index);
    case 'indexed':
      return model.index.sizeAt(index);
  }
};

const searchOffsets = (offsets: readonly number[], position: number): number => {
  let low = 0;
  let high = offsets.length - 2;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);

    if ((offsets[middle] ?? 0) <= position) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
};

export const indexAt = (model: SizeModel, position: number): number => {
  const count = countOf(model);

  if (count === 0) {
    return 0;
  }
  const last = count - 1;

  switch (model.kind) {
    case 'fixed':
      return model.size <= 0 ? 0 : clamp(Math.floor(position / model.size), 0, last);
    case 'variable':
      return clamp(searchOffsets(model.offsets, Math.max(0, position)), 0, last);
    case 'indexed':
      return clamp(model.index.indexAt(Math.max(0, position)), 0, last);
  }
};

export const rangeFor = (
  model: SizeModel,
  scrollTop: number,
  viewport: number,
  overscan: number,
): VirtualRange => {
  const count = countOf(model);

  if (count === 0) {
    return { start: 0, end: 0 };
  }
  const start = Math.max(0, indexAt(model, scrollTop) - overscan);
  const end = Math.min(count, indexAt(model, scrollTop + viewport) + 1 + overscan);
  return { start, end };
};

export const scrollTargetFor = (
  model: SizeModel,
  index: number,
  scrollTop: number,
  viewport: number,
  align: VirtualAlign,
): number | undefined => {
  const start = offsetAt(model, index);
  const end = start + sizeAt(model, index);
  const max = Math.max(0, totalSizeOf(model) - viewport);
  const bounded = (value: number): number => clamp(value, 0, max);

  switch (align) {
    case 'start':
      return bounded(start);
    case 'end':
      return bounded(end - viewport);
    case 'center':
      return bounded(start - (viewport - (end - start)) / 2);
    case 'auto':
      if (start < scrollTop) {
        return bounded(start);
      }
      return end > scrollTop + viewport ? bounded(end - viewport) : undefined;
  }
};

export interface CanvasScale {
  readonly canvas: number;
  readonly factor: number;
}

export const canvasScaleFor = (
  total: number,
  viewport: number,
  maxSize: number | undefined,
): CanvasScale => {
  if (maxSize === undefined || total <= maxSize || maxSize <= viewport) {
    return { canvas: total, factor: 1 };
  }
  return { canvas: maxSize, factor: (total - viewport) / (maxSize - viewport) };
};
