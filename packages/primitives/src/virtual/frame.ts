import type { VirtualRange } from './offsets';

export interface VirtualFrame {
  readonly lead: number;
  readonly rest: number;
  readonly clampStart: number;
  readonly clampEnd: number;
}

export interface VirtualFrameItem {
  readonly index: number;
  readonly size: number;
}

export interface VirtualFrameInput {
  readonly items: readonly VirtualFrameItem[];
  readonly range: VirtualRange;
  readonly startSize: number;
  readonly endSize: number;
  readonly viewport: number;
  readonly inset: number;
}

interface WindowSizes {
  readonly before: number;
  readonly inside: number;
  readonly after: number;
}

const NO_SIZES: WindowSizes = { before: 0, inside: 0, after: 0 };

const sizesOf = (items: readonly VirtualFrameItem[], range: VirtualRange): WindowSizes =>
  items.reduce((sizes, item) => {
    if (item.index < range.start) {
      return { ...sizes, before: sizes.before + item.size };
    }
    if (item.index >= range.end) {
      return { ...sizes, after: sizes.after + item.size };
    }
    return { ...sizes, inside: sizes.inside + item.size };
  }, NO_SIZES);

export const virtualFrameOf = ({
  items,
  range,
  startSize,
  endSize,
  viewport,
  inset,
}: VirtualFrameInput): VirtualFrame => {
  const { before, inside, after } = sizesOf(items, range);
  const overflow = viewport - inset - inside;

  return {
    lead: Math.max(0, startSize - before),
    rest: Math.max(0, endSize - after),
    clampStart: Math.min(0, overflow - before),
    clampEnd: Math.min(0, overflow - after),
  };
};

export const sameFrame = (a: VirtualFrame, b: VirtualFrame): boolean =>
  a.lead === b.lead &&
  a.rest === b.rest &&
  a.clampStart === b.clampStart &&
  a.clampEnd === b.clampEnd;
