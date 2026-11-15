import { clamp } from '@vueuse/core';
import type { SizeIndex } from './size-index';
import { SizeModelKind, VirtualAlign } from './virtual.types';

export type SizeModel =
  | { readonly kind: typeof SizeModelKind.Fixed; readonly size: number; readonly count: number }
  | { readonly kind: typeof SizeModelKind.Variable; readonly offsets: readonly number[] }
  | {
      readonly kind: typeof SizeModelKind.Indexed;
      readonly index: SizeIndex;
      readonly revision: number;
    };

export type ItemSize = number | ((index: number) => number) | SizeIndex;

export interface VirtualRange {
  readonly start: number;
  readonly end: number;
}

export interface CanvasScale {
  readonly canvas: number;
  readonly factor: number;
}

export interface CanvasMove {
  readonly shift: number;
  readonly from: number;
  readonly to: number;
  readonly factor: number;
  readonly end: number;
  readonly jump: number;
}

export interface CanvasPlace {
  readonly physical: number;
  readonly shift: number;
}

const isSizeIndex = (value: ItemSize): value is SizeIndex => typeof value === 'object';

export const buildSizeModel = (count: number, itemSize: ItemSize): SizeModel => {
  const total = Math.max(0, Math.floor(count));

  if (typeof itemSize === 'number') {
    return { kind: SizeModelKind.Fixed, size: itemSize, count: total };
  }
  if (isSizeIndex(itemSize)) {
    return { kind: SizeModelKind.Indexed, index: itemSize, revision: itemSize.revision() };
  }
  const offsets = [0];
  let sum = 0;

  for (let index = 0; index < total; index += 1) {
    sum += itemSize(index);
    offsets.push(sum);
  }
  return { kind: SizeModelKind.Variable, offsets };
};

export const countOf = (model: SizeModel): number => {
  switch (model.kind) {
    case SizeModelKind.Fixed:
      return model.count;
    case SizeModelKind.Variable:
      return model.offsets.length - 1;
    case SizeModelKind.Indexed:
      return model.index.count;
  }
};

export const totalSizeOf = (model: SizeModel): number => {
  switch (model.kind) {
    case SizeModelKind.Fixed:
      return model.size * model.count;
    case SizeModelKind.Variable:
      return model.offsets.at(-1) ?? 0;
    case SizeModelKind.Indexed:
      return model.index.total();
  }
};

export const offsetAt = (model: SizeModel, index: number): number => {
  const bounded = clamp(index, 0, countOf(model));

  switch (model.kind) {
    case SizeModelKind.Fixed:
      return bounded * model.size;
    case SizeModelKind.Variable:
      return model.offsets[bounded] ?? 0;
    case SizeModelKind.Indexed:
      return model.index.offsetAt(bounded);
  }
};

export const sizeAt = (model: SizeModel, index: number): number => {
  switch (model.kind) {
    case SizeModelKind.Fixed:
      return model.size;
    case SizeModelKind.Variable:
      return offsetAt(model, index + 1) - offsetAt(model, index);
    case SizeModelKind.Indexed:
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
    case SizeModelKind.Fixed:
      return model.size <= 0 ? 0 : clamp(Math.floor(position / model.size), 0, last);
    case SizeModelKind.Variable:
      return clamp(searchOffsets(model.offsets, Math.max(0, position)), 0, last);
    case SizeModelKind.Indexed:
      return clamp(model.index.indexAt(Math.max(0, position)), 0, last);
  }
};

const lastVisible = (model: SizeModel, scrollTop: number, viewport: number): number =>
  model.kind === SizeModelKind.Fixed && model.size > 0
    ? indexAt(model, scrollTop) + Math.ceil(viewport / model.size)
    : indexAt(model, scrollTop + viewport);

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
  const end = Math.min(count, lastVisible(model, scrollTop, viewport) + 1 + overscan);
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
    case VirtualAlign.Start:
      return bounded(start);
    case VirtualAlign.End:
      return bounded(end - viewport);
    case VirtualAlign.Center:
      return bounded(start - (viewport - (end - start)) / 2);
    case VirtualAlign.Auto:
      if (start < scrollTop) {
        return bounded(start);
      }
      return end > scrollTop + viewport ? bounded(Math.min(start, end - viewport)) : undefined;
  }
};

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

const SHIFT_SLOPE = 2;

export const canvasShiftFor = ({ shift, from, to, factor, end, jump }: CanvasMove): number => {
  if (factor === 1) {
    return 0;
  }
  if (Math.abs(to - from) > jump) {
    return to * (factor - 1);
  }
  const slope = SHIFT_SLOPE * (factor - 1);
  const high = Math.min(to * slope, end * factor - to);
  const low = Math.max(end * (factor - 1) - (end - to) * slope, -to);

  return clamp(shift, low, high);
};

export const canvasPlaceFor = (
  logical: number,
  { shift, factor, end }: Pick<CanvasMove, 'shift' | 'factor' | 'end'>,
): CanvasPlace => {
  if (factor === 1) {
    return { physical: logical, shift: 0 };
  }
  const kept = logical - shift;
  const move = { shift, from: kept, to: kept, factor, end, jump: Number.POSITIVE_INFINITY };
  const fits = kept >= 0 && kept <= end && canvasShiftFor(move) === shift;

  if (fits) {
    return { physical: kept, shift };
  }
  const physical = logical / factor;

  return { physical, shift: logical - physical };
};
