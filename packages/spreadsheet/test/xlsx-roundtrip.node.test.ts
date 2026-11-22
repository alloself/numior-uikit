import * as fc from 'fast-check';
import { describe, expect, it } from 'vite-plus/test';
import { readWorkbook, writeWorkbook } from '../src/xlsx';
import {
  BOOK_MOVE,
  BOOK_SEEDS,
  bookDesk,
  committed,
  formulaValuesOf,
  pictureOf,
  type BookDesk,
} from './book-moves';

const PROPERTY_TIMEOUT = 60_000;

const RUNS = 100;

const MOVES = 30;

const readBack = async (desk: BookDesk) => {
  const written = await writeWorkbook(desk.book, desk.calculator);

  if (!written.ok) {
    throw new Error(`the book was refused: ${JSON.stringify(written.report.losses)}`);
  }

  const read = await readWorkbook(written.bytes);

  if (read.kind === 'rejected') {
    throw new Error(`the package was rejected: ${read.reason} ${read.detail ?? ''}`);
  }
  return read;
};

describe('a book written to xlsx', () => {
  it(
    'reads back as the same book with the same saved values of its formulas',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          BOOK_SEEDS,
          fc.array(BOOK_MOVE, { maxLength: MOVES, size: 'max' }),
          async (seeds, moves) => {
            const desk = bookDesk(seeds);

            moves.forEach((move) => {
              committed(desk, move);
            });

            const picture = pictureOf(desk.book, desk.calculator);
            const values = formulaValuesOf(desk.calculator);
            const read = await readBack(desk);

            expect(formulaValuesOf(read.calculator)).toEqual(values);
            expect(pictureOf(read.book, read.calculator)).toEqual(picture);
          },
        ),
        { numRuns: RUNS },
      );
    },
    PROPERTY_TIMEOUT,
  );
});
