import { describe, expect, it } from 'vite-plus/test';
import { boxOf } from '../src/sheet/drawings/drawing-box';
import type { DrawingSpan } from '../src/sheet/drawings/drawings.types';

const NEAR = { row: (line: number): number => line, col: (line: number): number => line };

const NO_FROZEN = { rows: 0, cols: 0 };

const COVERED = { top: 100, start: 200, width: 400, height: 300 };

const spanAt = (row: number, col: number, dx = 0, dy = 0): DrawingSpan => ({
  from: { row, col, dx, dy },
  last: { row: row + 5, col: col + 3 },
  width: 400,
  height: 300,
});

const placeOf = (span: DrawingSpan, frozen = NO_FROZEN) => boxOf(span, NEAR, () => COVERED, frozen);

describe('drawing edges and grid lines', () => {
  it('laps a drawing that stands on the grid onto the lines of its neighbours', () => {
    expect(placeOf(spanAt(4, 2))?.rect).toEqual({ top: 99, start: 199, width: 401, height: 301 });
  });

  it('keeps a drawing set off the grid where its anchor says', () => {
    expect(placeOf(spanAt(4, 2, 8, 4))?.rect).toEqual({
      top: 104,
      start: 208,
      width: 400,
      height: 300,
    });
  });

  it('laps only the side that stands on the grid', () => {
    expect(placeOf(spanAt(4, 2, 1, 0))?.rect).toEqual({
      top: 99,
      start: 201,
      width: 400,
      height: 301,
    });
  });

  it('moves the selection frame together with the drawing inside the sheet', () => {
    const place = placeOf(spanAt(4, 2));

    expect(place?.frame).toEqual(place?.rect);
  });

  it('keeps the selection frame clear of the headers at the first row and column', () => {
    expect(placeOf(spanAt(0, 0))?.frame).toEqual({ ...COVERED });
  });

  it('keeps the selection frame clear of the frozen rows and columns', () => {
    expect(placeOf(spanAt(2, 1), { rows: 2, cols: 1 })?.frame).toEqual({ ...COVERED });
  });

  it('follows the columns the table really drew for a drawing sized by its cells', () => {
    const span = { ...spanAt(4, 2, 3, 2), cells: { width: 398, height: 300 } };

    expect(placeOf(span)?.rect).toEqual({ top: 102, start: 203, width: 402, height: 300 });
  });

  it('keeps the size of a drawing that is not sized by cells', () => {
    expect(placeOf(spanAt(4, 2, 3, 2))?.rect.width).toBe(400);
  });

  it('has no place for a range outside the table', () => {
    expect(boxOf(spanAt(4, 2), NEAR, () => undefined, NO_FROZEN)).toBeUndefined();
  });
});
