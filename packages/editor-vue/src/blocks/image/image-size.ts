import { CONTENT_ALIGNS, IMAGE_WIDTH, type NuiContentAlign } from '@numior/content';
import { clamp } from '@vueuse/core';

export const WIDTH_STEP = 0.05;

export const WIDE_STEP = 0.1;

export const alignOf = (value: unknown): NuiContentAlign =>
  CONTENT_ALIGNS.find((align) => align === value) ?? 'center';

export const clampShare = (share: number): number =>
  Math.round(clamp(share, IMAGE_WIDTH.min, IMAGE_WIDTH.max) * 1000) / 1000;

export const draggedShare = (
  start: number,
  delta: number,
  line: number,
  symmetric: boolean,
): number => clampShare((start + delta * (symmetric ? 2 : 1)) / Math.max(line, 1));

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

export const download = (owner: HTMLElement | undefined, url: string): void => {
  const link = owner?.ownerDocument.createElement('a');

  if (link === undefined) {
    return;
  }
  link.href = url;
  link.download = '';
  link.target = '_blank';
  link.rel = 'noopener';
  link.click();
};
