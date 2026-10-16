import { describe, expect, it } from 'vite-plus/test';
import {
  allOf,
  colsOf,
  columnSpansOf,
  copyShapeOf,
  cutRanges,
  inRanges,
  inSpans,
  revealAxisOf,
  rowsOf,
  sameRanges,
  segmentsOf,
  spanItems,
  spanLength,
  stepCorner,
  tidyRanges,
  widenRange,
  withLast,
} from '../src/table/table-ranges';
import { htmlOf, tsvOf } from '../src/table/table-clipboard';

const BOUNDS = { rows: 10, cols: 5 };
const KEY = { ctrl: false, page: 3, rtl: false };

const range = (top: number, start: number, bottom: number, end: number) => ({
  from: { row: top, col: start },
  to: { row: bottom, col: end },
});

describe('table ranges', () => {
  it('moves the free corner by arrows, pages, edges and the reading direction', () => {
    const corner = { row: 4, col: 2 };

    expect(stepCorner(corner, { ...KEY, key: 'ArrowDown' }, BOUNDS)).toEqual({ row: 5, col: 2 });

    expect(stepCorner(corner, { ...KEY, key: 'ArrowUp', ctrl: true }, BOUNDS)).toEqual({
      row: 0,
      col: 2,
    });

    expect(stepCorner(corner, { ...KEY, key: 'PageDown' }, BOUNDS)).toEqual({ row: 7, col: 2 });
    expect(stepCorner(corner, { ...KEY, key: 'PageUp' }, BOUNDS)).toEqual({ row: 1, col: 2 });
    expect(stepCorner(corner, { ...KEY, key: 'ArrowRight' }, BOUNDS)).toEqual({ row: 4, col: 3 });

    expect(stepCorner(corner, { ...KEY, key: 'ArrowRight', rtl: true }, BOUNDS)).toEqual({
      row: 4,
      col: 1,
    });

    expect(stepCorner(corner, { ...KEY, key: 'ArrowLeft', ctrl: true }, BOUNDS)).toEqual({
      row: 4,
      col: 0,
    });

    expect(stepCorner(corner, { ...KEY, key: 'End' }, BOUNDS)).toEqual({ row: 4, col: 4 });

    expect(stepCorner(corner, { ...KEY, key: 'End', ctrl: true }, BOUNDS)).toEqual({
      row: 9,
      col: 4,
    });

    expect(stepCorner(corner, { ...KEY, key: 'Home', ctrl: true }, BOUNDS)).toEqual({
      row: 0,
      col: 0,
    });

    expect(stepCorner({ row: 9, col: 4 }, { ...KEY, key: 'PageDown' }, BOUNDS)).toEqual({
      row: 9,
      col: 4,
    });

    expect(stepCorner(corner, { ...KEY, key: 'Enter' }, BOUNDS)).toBeUndefined();
  });

  it('cuts holes, places the last range over the others and widens it to rows, columns or everything', () => {
    const list = [range(1, 1, 1, 1), range(3, 2, 4, 3)];

    expect(cutRanges([range(0, 0, 4, 4)], range(2, 2, 2, 2))).toEqual([
      range(0, 0, 1, 4),
      range(2, 0, 2, 1),
      range(2, 3, 2, 4),
      range(3, 0, 4, 4),
    ]);

    expect(cutRanges([range(0, 0, 1, 1)], range(3, 3, 4, 4))).toEqual([range(0, 0, 1, 1)]);
    expect(cutRanges([range(1, 1, 2, 2)], range(4, 4, 0, 0))).toEqual([]);

    expect(withLast([range(0, 0, 2, 3)], range(1, 2, 4, 2))).toEqual([
      range(0, 0, 0, 3),
      range(1, 0, 2, 1),
      range(1, 3, 2, 3),
      range(1, 2, 4, 2),
    ]);

    expect(tidyRanges([range(4, 1, 4, 1), range(3, 1, 2, 1)])).toEqual([range(4, 1, 2, 1)]);

    expect(tidyRanges([range(3, 3, 1, 1), range(5, 5, 5, 5)])).toEqual([
      range(3, 3, 1, 1),
      range(5, 5, 5, 5),
    ]);

    expect(
      tidyRanges([...cutRanges([range(0, 0, 4, 4)], range(2, 2, 2, 2)), range(2, 2, 2, 2)]),
    ).toEqual([range(0, 0, 4, 4)]);

    expect(rowsOf(range(3, 2, 4, 3), BOUNDS)).toEqual(range(3, 0, 4, 4));
    expect(colsOf(range(3, 2, 4, 3), BOUNDS)).toEqual(range(0, 2, 9, 3));
    expect(allOf(BOUNDS)).toEqual(range(0, 0, 9, 4));
    expect(inRanges(list, { row: 4, col: 2 })).toBe(true);
    expect(inRanges(list, { row: 2, col: 2 })).toBe(false);
    expect(sameRanges(list, [range(1, 1, 1, 1), range(3, 2, 4, 3)])).toBe(true);
    expect(sameRanges(list, [range(1, 1, 1, 1)])).toBe(false);
  });

  it('widens a range to whole lines and reveals a whole line only along the other axis', () => {
    const cell = range(3, 2, 3, 2);

    expect(widenRange(cell, 'cells', BOUNDS)).toBe(cell);
    expect(widenRange(range(3, 2, 5, 2), 'rows', BOUNDS)).toEqual(range(3, 0, 5, 4));
    expect(widenRange(range(3, 1, 3, 2), 'cols', BOUNDS)).toEqual(range(0, 1, 9, 2));
    expect(revealAxisOf(range(3, 2, 5, 3), BOUNDS)).toBe('both');
    expect(revealAxisOf(range(3, 0, 5, 4), BOUNDS)).toBe('row');
    expect(revealAxisOf(range(9, 1, 0, 2), BOUNDS)).toBe('col');
    expect(revealAxisOf(allOf(BOUNDS), BOUNDS)).toBe('none');
    expect(revealAxisOf(range(0, 0, 0, 2), { rows: 1, cols: 5 })).toBe('both');
  });

  it('merges the columns under the ranges into spans of visual columns', () => {
    const spans = columnSpansOf([range(0, 3, 9, 3), range(2, 0, 4, 1), range(6, 2, 6, 2)], 2);

    expect(spans).toEqual([{ start: 2, end: 5 }]);

    expect(columnSpansOf([range(0, 0, 1, 0), range(5, 3, 5, 4)], 1)).toEqual([
      { start: 1, end: 1 },
      { start: 4, end: 5 },
    ]);

    expect(inSpans(spans, 5)).toBe(true);
    expect(inSpans(spans, 6)).toBe(false);
    expect(columnSpansOf([], 1)).toEqual([]);
  });

  it('outlines the union of the ranges in visual columns, holes included', () => {
    const list = [range(4, 3, 2, 1), range(3, 2, 3, 2)];
    const holed = cutRanges([range(0, 0, 4, 4)], range(2, 2, 2, 2));
    const edges = { top: false, bottom: false, start: false, end: false };

    expect(segmentsOf(list, 2, 1)).toEqual([
      { from: 2, to: 4, top: true, bottom: false, start: true, end: true },
    ]);

    expect(segmentsOf(list, 3, 0)).toEqual([
      { from: 1, to: 3, top: false, bottom: false, start: true, end: true },
    ]);

    expect(segmentsOf(list, 5, 0)).toEqual([]);

    expect(segmentsOf(holed, 1, 0)).toEqual([
      { ...edges, from: 0, to: 1, start: true },
      { ...edges, from: 2, to: 2, bottom: true },
      { ...edges, from: 3, to: 4, end: true },
    ]);

    expect(segmentsOf(holed, 2, 0)).toEqual([
      { ...edges, from: 0, to: 1, start: true, end: true },
      { ...edges, from: 3, to: 4, start: true, end: true },
    ]);
  });

  it('copies ranges that share rows or columns as one block and refuses the rest', () => {
    expect(copyShapeOf([range(1, 0, 2, 1), range(2, 3, 1, 3)])).toEqual({
      kind: 'block',
      rows: [{ start: 1, end: 2 }],
      cols: [
        { start: 0, end: 1 },
        { start: 3, end: 3 },
      ],
    });

    expect(copyShapeOf([range(5, 1, 6, 2), range(1, 1, 3, 2), range(4, 1, 4, 2)])).toEqual({
      kind: 'block',
      rows: [{ start: 1, end: 6 }],
      cols: [{ start: 1, end: 2 }],
    });

    expect(copyShapeOf([range(1, 1, 2, 1), range(4, 3, 5, 4)])).toEqual({ kind: 'disjoint' });
    expect(copyShapeOf([])).toEqual({ kind: 'disjoint' });

    expect(
      spanItems([
        { start: 0, end: 1 },
        { start: 3, end: 3 },
      ]),
    ).toEqual([0, 1, 3]);

    expect(
      spanLength([
        { start: 0, end: 1 },
        { start: 3, end: 3 },
      ]),
    ).toBe(3);
  });

  it('writes tab separated text with Excel quoting and an escaped HTML table', () => {
    expect(
      tsvOf([
        ['a', 'b\tc'],
        ['say "hi"', 'x\ny'],
      ]),
    ).toBe('a\t"b\tc"\n"say ""hi"""\t"x\ny"');

    expect(htmlOf(['<Имя>'], [['A & B'], ['"q"']])).toBe(
      '<table><thead><tr><th>&lt;Имя&gt;</th></tr></thead><tbody><tr><td>A &amp; B</td></tr><tr><td>&quot;q&quot;</td></tr></tbody></table>',
    );

    expect(htmlOf(undefined, [['1']])).toBe('<table><tbody><tr><td>1</td></tr></tbody></table>');
  });
});
