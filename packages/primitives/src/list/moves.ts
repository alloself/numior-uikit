import { clamp } from '@vueuse/core';

export type ListOrientation = 'vertical' | 'horizontal' | 'both';
export type ListMove = 'first' | 'last' | 'next' | 'prev' | 'page-next' | 'page-prev';

const horizontalMoves = (rtl: boolean): Record<string, ListMove> =>
  rtl ? { ArrowLeft: 'next', ArrowRight: 'prev' } : { ArrowRight: 'next', ArrowLeft: 'prev' };

const movesFor = (orientation: ListOrientation, rtl: boolean): Record<string, ListMove> => ({
  ...(orientation === 'horizontal' ? {} : { ArrowDown: 'next', ArrowUp: 'prev' }),
  ...(orientation === 'vertical' ? {} : horizontalMoves(rtl)),
  Home: 'first',
  End: 'last',
  PageDown: 'page-next',
  PageUp: 'page-prev',
});

export const listMoveFor = (
  key: string,
  orientation: ListOrientation,
  rtl: boolean,
): ListMove | undefined => movesFor(orientation, rtl)[key];

const wrapIndex = (value: number, length: number, loop: boolean): number =>
  loop ? (value + length) % length : clamp(value, 0, length - 1);

export const listTargetIndex = (
  move: ListMove,
  current: number,
  length: number,
  loop: boolean,
  page: number,
): number => {
  const last = length - 1;

  const targets: Record<ListMove, number> = {
    first: 0,
    last,
    next: current < 0 ? 0 : wrapIndex(current + 1, length, loop),
    prev: current < 0 ? last : wrapIndex(current - 1, length, loop),
    'page-next': clamp(Math.max(0, current) + page, 0, last),
    'page-prev': Math.max(0, current - page),
  };

  return targets[move];
};
