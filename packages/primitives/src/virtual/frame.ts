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
  readonly frozen?: number | undefined;
}

type WindowPart = 'frozen' | 'before' | 'inside' | 'after';

type WindowSizes = Readonly<Record<WindowPart, number>>;

const NO_SIZES: WindowSizes = { frozen: 0, before: 0, inside: 0, after: 0 };

const partOf = (index: number, range: VirtualRange, frozen: number): WindowPart => {
  if (index < frozen) {
    return 'frozen';
  }
  if (index < range.start) {
    return 'before';
  }
  return index >= range.end ? 'after' : 'inside';
};

const sizesOf = (
  items: readonly VirtualFrameItem[],
  range: VirtualRange,
  frozen: number,
): WindowSizes =>
  items.reduce((sizes, item) => {
    const part = partOf(item.index, range, frozen);

    return { ...sizes, [part]: sizes[part] + item.size };
  }, NO_SIZES);

export const virtualFrameOf = ({
  items,
  range,
  startSize,
  endSize,
  viewport,
  inset,
  frozen = 0,
}: VirtualFrameInput): VirtualFrame => {
  const sizes = sizesOf(items, range, frozen);
  const overflow = viewport - inset - sizes.frozen - sizes.inside;

  return {
    lead: Math.max(0, startSize - sizes.frozen - sizes.before),
    rest: Math.max(0, endSize - sizes.after),
    clampStart: Math.min(0, overflow - sizes.before),
    clampEnd: Math.min(0, overflow - sizes.after),
  };
};

export const sameFrame = (a: VirtualFrame, b: VirtualFrame): boolean =>
  a.lead === b.lead &&
  a.rest === b.rest &&
  a.clampStart === b.clampStart &&
  a.clampEnd === b.clampEnd;
