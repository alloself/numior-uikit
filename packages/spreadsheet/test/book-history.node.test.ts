import * as fc from 'fast-check';
import { describe, expect, it } from 'vite-plus/test';
import { BOOK_MOVE, BOOK_SEEDS, bookDesk, committed, pictureOf, type BookDesk } from './book-moves';

const PROPERTY_TIMEOUT = 60_000;

const RUNS = 200;

const MOVES = 30;

const undoneAll = (desk: BookDesk): number => {
  let count = 0;

  while (desk.history.undo() !== undefined) {
    count += 1;
  }

  return count;
};

const redoneAll = (desk: BookDesk): number => {
  let count = 0;

  while (desk.history.redo() !== undefined) {
    count += 1;
  }

  return count;
};

describe('the history of a book', () => {
  it(
    'takes the book back to its first state by undoing everything and to its last state by redoing everything',
    () => {
      fc.assert(
        fc.property(
          BOOK_SEEDS,
          fc.array(BOOK_MOVE, { maxLength: MOVES, size: 'max' }),
          (seeds, moves) => {
            const desk = bookDesk(seeds);
            const first = pictureOf(desk.book, desk.calculator);

            const applied = moves.reduce(
              (count, move) => (committed(desk, move) ? count + 1 : count),
              0,
            );

            const last = pictureOf(desk.book, desk.calculator);

            expect(undoneAll(desk)).toBe(applied);
            expect(pictureOf(desk.book, desk.calculator)).toEqual(first);

            expect(redoneAll(desk)).toBe(applied);
            expect(pictureOf(desk.book, desk.calculator)).toEqual(last);
          },
        ),
        { numRuns: RUNS },
      );
    },
    PROPERTY_TIMEOUT,
  );
});
