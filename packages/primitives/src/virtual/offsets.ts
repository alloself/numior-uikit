import { clamp } from '@vueuse/core';

export type SizeModel =
  | { readonly kind: 'fixed'; readonly size: number; readonly count: number }
  | { readonly kind: 'variable'; readonly offsets: readonly number[] };

export interface VirtualRange {
  readonly start: number;
  readonly end: number;
}

export type VirtualAlign = 'auto' | 'start' | 'center' | 'end';

export const buildSizeModel = (
  count: number,
  itemSize: number | ((index: number) => number),
): SizeModel => {
  const total = Math.max(0, Math.floor(count));
  if (typeof itemSize === 'number') {
    return { kind: 'fixed', size: itemSize, count: total };
  }
  const offsets = [0];
  let sum = 0;
  for (let index = 0; index < total; index += 1) {
    sum += itemSize(index);
    offsets.push(sum);
  }
  return { kind: 'variable', offsets };
};

export const countOf = (model: SizeModel): number =>
  model.kind === 'fixed' ? model.count : model.offsets.length - 1;

export const totalSizeOf = (model: SizeModel): number =>
  model.kind === 'fixed' ? model.size * model.count : (model.offsets.at(-1) ?? 0);

export const offsetAt = (model: SizeModel, index: number): number => {
  const bounded = clamp(index, 0, countOf(model));
  return model.kind === 'fixed' ? bounded * model.size : (model.offsets[bounded] ?? 0);
};

export const sizeAt = (model: SizeModel, index: number): number =>
  model.kind === 'fixed' ? model.size : offsetAt(model, index + 1) - offsetAt(model, index);

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
  if (model.kind === 'fixed') {
    return model.size <= 0 ? 0 : clamp(Math.floor(position / model.size), 0, last);
  }
  return clamp(searchOffsets(model.offsets, Math.max(0, position)), 0, last);
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
