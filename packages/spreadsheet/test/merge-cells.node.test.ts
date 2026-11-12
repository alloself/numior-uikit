import { describe, expect, it } from 'vite-plus/test';
import {
  formatRange,
  mergeBlocked,
  mergeCells,
  mergeableRanges,
  parseRange,
  unmergeCells,
  type CellRange,
} from '../src/core';
import { openBook } from './book-harness';

type Merges = ReturnType<typeof openMerges>;

const rangeAt = (address: string): CellRange => {
  const range = parseRange(address);

  if (range === undefined) {
    throw new Error(`${address} is not a range`);
  }
  return range;
};

const openMerges = () => {
  const harness = openBook();

  const committed = (steps: Parameters<typeof harness.history.commit>[0]): void => {
    const outcome = harness.history.commit(steps);

    if (!outcome.ok) {
      throw new Error(`The steps were refused: ${outcome.reason}`);
    }
  };

  return {
    ...harness,
    merge: (...addresses: string[]): number => {
      const plan = mergeCells(
        harness.book,
        harness.calculator,
        harness.first,
        addresses.map(rangeAt),
      );

      committed(plan.steps);
      return plan.dropped;
    },
    unmerge: (...addresses: string[]): void => {
      committed(unmergeCells(harness.first, addresses.map(rangeAt)));
    },
    offered: (...addresses: string[]): string[] =>
      mergeableRanges(harness.first, addresses.map(rangeAt)).map((range) => formatRange(range)),
    blocked: (...addresses: string[]): boolean =>
      mergeBlocked(harness.book, harness.first, addresses.map(rangeAt)),
  };
};

const mergesOf = (sheet: Merges): string[] =>
  sheet.first.layout.merges.map((merge) => formatRange(merge)).toSorted();

const shownIn = (sheet: Merges, ...addresses: string[]): string[] =>
  addresses.map((address) => sheet.shown(address));

describe('merging cells of a sheet', () => {
  it('keeps the value of the first cell and empties the cells it now covers', () => {
    const sheet = openMerges();

    sheet.type('A1', 'Total');
    sheet.type('B1', '2');
    sheet.type('A2', '3');
    sheet.type('C1', '=SUM(A1:B2)');

    const dropped = sheet.merge('A1:B2');

    expect(mergesOf(sheet)).toEqual(['A1:B2']);
    expect(dropped).toBe(2);
    expect(shownIn(sheet, 'A1', 'B1', 'A2', 'C1')).toEqual(['Total', '', '', '0']);
  });

  it('brings the first filled value to the first cell when that cell is empty', () => {
    const sheet = openMerges();

    sheet.type('D1', '7');
    sheet.type('B2', '=D1*2');
    sheet.type('B3', 'tail');

    const dropped = sheet.merge('A1:B3');

    expect(dropped).toBe(1);
    expect(sheet.input('A1')).toBe('=D1*2');
    expect(shownIn(sheet, 'A1', 'B2', 'B3')).toEqual(['14', '', '']);
  });

  it('returns the cells and their values on one undo', () => {
    const sheet = openMerges();

    sheet.type('B1', 'kept');
    sheet.type('B2', 'gone');
    sheet.merge('A1:B2');

    sheet.history.undo();

    expect(mergesOf(sheet)).toEqual([]);
    expect(shownIn(sheet, 'A1', 'B1', 'B2')).toEqual(['', 'kept', 'gone']);
  });

  it('replaces the merges inside the new one and merges every range on its own', () => {
    const sheet = openMerges();

    sheet.merge('A1:B1');
    sheet.merge('A1:B3', 'D1:D2');

    expect(mergesOf(sheet)).toEqual(['A1:B3', 'D1:D2']);
  });

  it('takes apart only the merges that the ranges meet and keeps their values in place', () => {
    const sheet = openMerges();

    sheet.type('A1', 'Total');
    sheet.merge('A1:B2', 'D1:E1');

    sheet.unmerge('B2:C4');

    expect(mergesOf(sheet)).toEqual(['D1:E1']);
    expect(shownIn(sheet, 'A1', 'B2')).toEqual(['Total', '']);
  });

  it('offers to merge ranges of several cells that are not merged yet and do not meet', () => {
    const sheet = openMerges();

    sheet.merge('A1:B2');

    expect(sheet.offered('A1:B2')).toEqual([]);
    expect(sheet.offered('C3')).toEqual([]);
    expect(sheet.offered('A1:C2', 'E1:E2', 'G1')).toEqual(['A1:C2', 'E1:E2']);
    expect(sheet.offered('A1:C2', 'C2:D3')).toEqual([]);
    expect(sheet.offered('A:A')).toEqual([]);
    expect(sheet.offered('3:4')).toEqual([]);
  });

  it('finds a table or a pivot table under a range', () => {
    const sheet = openMerges();

    sheet.type('A1', 'Item');
    sheet.type('A2', 'Pen');
    sheet.table('A1:A2');

    expect(sheet.blocked('A2:B2')).toBe(true);
    expect(sheet.blocked('C1:D2')).toBe(false);
  });
});
