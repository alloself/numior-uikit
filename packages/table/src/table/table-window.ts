import type { VirtualItem, VirtualRange } from '@numior/primitives';

export interface TableWindowInput {
  readonly items: readonly VirtualItem[];
  readonly range: VirtualRange;
  readonly startSize: number;
  readonly endSize: number;
  readonly viewport: number;
  readonly chrome: number;
}

export interface TableWindowFrame {
  readonly lead: number;
  readonly rest: number;
  readonly clampStart: number;
  readonly clampEnd: number;
}

interface WindowSizes {
  readonly before: number;
  readonly inside: number;
  readonly after: number;
}

const NO_SIZES: WindowSizes = { before: 0, inside: 0, after: 0 };

export const STILL_FRAME: TableWindowFrame = { lead: 0, rest: 0, clampStart: 0, clampEnd: 0 };

const sizesOf = (items: readonly VirtualItem[], range: VirtualRange): WindowSizes =>
  items.reduce((sizes, item) => {
    if (item.index < range.start) {
      return { ...sizes, before: sizes.before + item.size };
    }
    if (item.index >= range.end) {
      return { ...sizes, after: sizes.after + item.size };
    }
    return { ...sizes, inside: sizes.inside + item.size };
  }, NO_SIZES);

export const tableWindowFrame = ({
  items,
  range,
  startSize,
  endSize,
  viewport,
  chrome,
}: TableWindowInput): TableWindowFrame => {
  const { before, inside, after } = sizesOf(items, range);
  const overflow = viewport - chrome - inside;

  return {
    lead: Math.max(0, startSize - before),
    rest: Math.max(0, endSize - after),
    clampStart: Math.min(0, overflow - before),
    clampEnd: Math.min(0, overflow - after),
  };
};
