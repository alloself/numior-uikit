import { clamp } from '@vueuse/core';
import { Key } from '../keyboard/key.types';
import { ListMove, ListOrientation } from './list.types';

const horizontalMoves = (rtl: boolean): Record<string, ListMove> => ({
  [rtl ? Key.ArrowLeft : Key.ArrowRight]: ListMove.Next,
  [rtl ? Key.ArrowRight : Key.ArrowLeft]: ListMove.Prev,
});

const VERTICAL_MOVES: Readonly<Record<string, ListMove>> = {
  [Key.ArrowDown]: ListMove.Next,
  [Key.ArrowUp]: ListMove.Prev,
};

const movesFor = (orientation: ListOrientation, rtl: boolean): Record<string, ListMove> => ({
  ...(orientation === ListOrientation.Horizontal ? {} : VERTICAL_MOVES),
  ...(orientation === ListOrientation.Vertical ? {} : horizontalMoves(rtl)),
  [Key.Home]: ListMove.First,
  [Key.End]: ListMove.Last,
  [Key.PageDown]: ListMove.PageNext,
  [Key.PageUp]: ListMove.PagePrev,
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
    [ListMove.First]: 0,
    [ListMove.Last]: last,
    [ListMove.Next]: current < 0 ? 0 : wrapIndex(current + 1, length, loop),
    [ListMove.Prev]: current < 0 ? last : wrapIndex(current - 1, length, loop),
    [ListMove.PageNext]: clamp(Math.max(0, current) + page, 0, last),
    [ListMove.PagePrev]: Math.max(0, current - page),
  };

  return targets[move];
};
