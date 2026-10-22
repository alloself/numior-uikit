import {
  CONTENT_ALIGNS,
  CONTENT_WRAPS,
  IMAGE_WIDTH,
  type NuiContentAlign,
  type NuiContentWrap,
} from '@numior/content';
import { clamp } from '@vueuse/core';

export interface GripPull {
  readonly sign: number;
  readonly lift: number;
  readonly ratio: number;
}

export const WIDTH_STEP = 0.05;

export const WIDE_STEP = 0.1;

export const alignOf = (value: unknown): NuiContentAlign =>
  CONTENT_ALIGNS.find((align) => align === value) ?? 'center';

export const wrapOf = (value: unknown): NuiContentWrap =>
  CONTENT_WRAPS.find((wrap) => wrap === value) ?? 'inline';

export const clampShare = (share: number): number =>
  Math.round(clamp(share, IMAGE_WIDTH.min, IMAGE_WIDTH.max) * 1000) / 1000;

export const draggedShare = (
  start: number,
  delta: number,
  line: number,
  symmetric: boolean,
): number => clampShare((start + delta * (symmetric ? 2 : 1)) / Math.max(line, 1));

export const aspectOf = (picture: HTMLImageElement | null): number => {
  const box = picture?.getBoundingClientRect();

  return box === undefined || box.height === 0 ? 0 : box.width / box.height;
};

export const pullOf = (pull: GripPull, x: number, y: number): number => {
  const across = x * pull.sign;
  const along = y * pull.lift * pull.ratio;

  return Math.abs(along) > Math.abs(across) ? along : across;
};

export const lineWidthOf = (element: HTMLElement): number => {
  const parent = element.parentElement;

  if (parent === null) {
    return element.getBoundingClientRect().width;
  }
  const style = getComputedStyle(parent);

  return (
    parent.clientWidth -
    (Number.parseFloat(style.paddingInlineStart) || 0) -
    (Number.parseFloat(style.paddingInlineEnd) || 0)
  );
};

export const follow = (owner: HTMLElement | undefined, url: string, save: boolean): void => {
  const link = owner?.ownerDocument.createElement('a');

  if (link === undefined) {
    return;
  }
  link.href = url;
  if (save) {
    link.download = '';
  }
  link.target = '_blank';
  link.rel = 'noopener';
  link.click();
};
