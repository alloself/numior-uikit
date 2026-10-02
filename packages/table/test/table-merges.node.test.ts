import { describe, expect, it } from 'vitest';
import {
  anchorOf,
  consecutiveRuns,
  createMergeIndex,
  expandToMerges,
  keepSpans,
  leaveMerge,
  leaveMergeBy,
  mergeSpans,
  pieceOf,
  spansLines,
} from '../src/table/table-merges';
import type { TableMergeSlot } from '../src/table/table.types';

const BOUNDS = { rows: 200, cols: 8 };

const range = (top: number, start: number, bottom: number, end: number) => ({
  from: { row: top, col: start },
  to: { row: bottom, col: end },
});

const MERGES = [range(1, 1, 3, 2), range(5, 0, 5, 7), range(40, 3, 120, 3)];

const SLOTS: readonly TableMergeSlot[] = [
  { key: 'a', pane: 'start', col: 0 },
  { key: 'b', pane: 'start', col: 1, edge: true },
  { key: 'c', pane: 'centre', col: 2 },
  { key: 'gap', pane: 'centre', col: undefined },
  { key: 'f', pane: 'centre', col: 5 },
  { key: 'g', pane: 'centre', col: 6, tail: true },
  { key: 'trail', pane: 'centre', col: undefined },
  { key: 'h', pane: 'end', col: 7 },
];

const geometry = {
  rowOffset: (position: number): number => position * 40,
  colOffset: (col: number): number => col * 100,
};

describe('table merges', () => {
  it('finds the merge of a cell and the merges that cross a band of rows', () => {
    const index = createMergeIndex(MERGES, BOUNDS);

    expect(index.size).toBe(3);
    expect(index.at(2, 2)).toEqual({ top: 1, bottom: 3, start: 1, end: 2 });
    expect(index.at(2, 3)).toBeUndefined();
    expect(index.at(100, 3)).toEqual({ top: 40, bottom: 120, start: 3, end: 3 });
    expect(index.within(4, 39).map((merge) => merge.top)).toEqual([5]);
    expect(index.within(60, 70).map((merge) => merge.top)).toEqual([40]);
    expect(index.within(130, 199)).toEqual([]);
  });

  it('drops single cells, clips merges to the table and keeps the first of two that overlap', () => {
    const index = createMergeIndex(
      [range(0, 0, 0, 0), range(2, 2, 3, 3), range(3, 3, 4, 4), range(198, 6, 400, 12)],
      BOUNDS,
    );

    expect(index.size).toBe(2);
    expect(index.at(4, 4)).toBeUndefined();
    expect(index.at(199, 7)).toEqual({ top: 198, bottom: 199, start: 6, end: 7 });
  });

  it('grows a range until it holds every merge it touches and keeps its moving corner', () => {
    const index = createMergeIndex([...MERGES, range(3, 3, 4, 4)], BOUNDS);

    expect(expandToMerges(index, range(0, 0, 0, 0), BOUNDS)).toEqual(range(0, 0, 0, 0));
    expect(expandToMerges(index, range(2, 2, 2, 2), BOUNDS)).toEqual(range(1, 1, 3, 2));
    expect(expandToMerges(index, range(2, 2, 3, 3), BOUNDS)).toEqual(range(1, 1, 4, 4));
    expect(expandToMerges(index, range(4, 4, 2, 2), BOUNDS)).toEqual(range(4, 4, 1, 1));
    expect(expandToMerges(index, range(4, 6, 5, 6), BOUNDS)).toEqual(range(1, 0, 5, 7));
  });

  it('leaves whole rows and whole columns as they are, whatever merges they cross', () => {
    const index = createMergeIndex(MERGES, BOUNDS);

    expect(spansLines(range(2, 0, 2, 7), BOUNDS)).toBe(true);
    expect(spansLines(range(199, 3, 0, 3), BOUNDS)).toBe(true);
    expect(spansLines(range(2, 0, 2, 6), BOUNDS)).toBe(false);
    expect(expandToMerges(index, range(2, 0, 2, 7), BOUNDS)).toEqual(range(2, 0, 2, 7));
    expect(expandToMerges(index, range(0, 2, 199, 2), BOUNDS)).toEqual(range(0, 2, 199, 2));
    expect(consecutiveRuns([3, 10, 11, 12, 40])).toEqual([[3], [10, 11, 12], [40]]);
    expect(consecutiveRuns([])).toEqual([]);
  });

  it('names the anchor of a merged cell and leaves a merge from its far edge', () => {
    const index = createMergeIndex(MERGES, BOUNDS);

    expect(anchorOf(index, { row: 3, col: 2 })).toEqual({ row: 1, col: 1 });
    expect(anchorOf(index, { row: 0, col: 2 })).toEqual({ row: 0, col: 2 });
    expect(leaveMerge(index, { row: 2, col: 1 }, 'ArrowRight', false)).toEqual({ row: 2, col: 2 });
    expect(leaveMerge(index, { row: 2, col: 2 }, 'ArrowLeft', false)).toEqual({ row: 2, col: 1 });
    expect(leaveMerge(index, { row: 2, col: 1 }, 'ArrowLeft', true)).toEqual({ row: 2, col: 2 });
    expect(leaveMerge(index, { row: 2, col: 2 }, 'ArrowDown', false)).toEqual({ row: 3, col: 2 });
    expect(leaveMerge(index, { row: 2, col: 2 }, 'ArrowUp', false)).toEqual({ row: 1, col: 2 });
    expect(leaveMerge(index, { row: 2, col: 2 }, 'Home', false)).toEqual({ row: 2, col: 2 });
    expect(leaveMergeBy(index, { row: 1, col: 1 }, 'down')).toEqual({ row: 3, col: 1 });
    expect(leaveMergeBy(index, { row: 1, col: 1 }, 'next')).toEqual({ row: 1, col: 2 });
    expect(leaveMergeBy(index, { row: 3, col: 2 }, 'up')).toEqual({ row: 1, col: 2 });
    expect(leaveMergeBy(index, { row: 3, col: 2 }, 'previous')).toEqual({ row: 3, col: 1 });
    expect(leaveMergeBy(index, { row: 3, col: 2 }, 'stay')).toEqual({ row: 3, col: 2 });
  });

  it('splits a merge into one piece per pane and covers the cells and gaps behind it', () => {
    const index = createMergeIndex(MERGES, BOUNDS);
    const merges = index.within(0, 9);
    const { spans, pieces } = mergeSpans(merges, [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]], SLOTS, geometry);

    const lead = {
      kind: 'lead',
      row: 1,
      anchor: { row: 1, col: 1 },
      rows: 3,
      cols: 2,
      span: 1,
      tail: false,
      width: 200,
    };

    expect(spans.get(1)?.get('b')).toEqual({
      ...lead,
      col: 1,
      rowspan: 3,
      colspan: 1,
      edge: true,
      x: 0,
      y: 0,
      height: 120,
    });

    expect(spans.get(1)?.get('c')).toEqual({
      ...lead,
      col: 2,
      rowspan: 3,
      colspan: 1,
      edge: false,
      x: 100,
      y: 0,
      height: 120,
    });

    expect(spans.get(2)?.get('b')).toEqual({ kind: 'covered' });
    expect(spans.get(3)?.get('c')).toEqual({ kind: 'covered' });
    expect(spans.get(1)?.get('a')).toBeUndefined();
    expect([...(spans.get(5)?.keys() ?? [])]).toEqual(['a', 'b', 'c', 'gap', 'f', 'g', 'h']);

    expect(spans.get(5)?.get('a')).toMatchObject({
      kind: 'lead',
      span: 2,
      edge: true,
      tail: false,
    });

    expect(spans.get(5)?.get('c')).toMatchObject({
      kind: 'lead',
      colspan: 4,
      span: 5,
      edge: false,
      tail: true,
      x: 200,
      width: 800,
    });

    expect(spans.get(5)?.get('gap')).toEqual({ kind: 'covered' });
    expect(spans.get(5)?.get('trail')).toBeUndefined();
    expect(spans.get(5)?.get('h')).toMatchObject({ kind: 'lead', colspan: 1, x: 700 });
    const square = index.at(2, 2);
    const parts = square === undefined ? undefined : pieces.get(square);

    expect(parts).toEqual([
      { top: 1, bottom: 3, start: 1, end: 1 },
      { top: 1, bottom: 3, start: 2, end: 2 },
    ]);

    expect(pieceOf(parts, { row: 3, col: 2 })).toEqual({ top: 1, bottom: 3, start: 2, end: 2 });
    expect(pieceOf(parts, { row: 4, col: 2 })).toBeUndefined();
  });

  it('continues a tall merge from the first row of the window and from a row held outside it', () => {
    const index = createMergeIndex(MERGES, BOUNDS);
    const slots = SLOTS.map((slot) => (slot.key === 'gap' ? { ...slot, key: 'd', col: 3 } : slot));
    const { spans } = mergeSpans(index.within(60, 70), [[45], [60, 61, 62]], slots, geometry);

    expect(spans.get(45)?.get('d')).toMatchObject({
      kind: 'lead',
      row: 45,
      rowspan: 1,
      y: 200,
      height: 3240,
    });

    expect(spans.get(60)?.get('d')).toMatchObject({
      kind: 'lead',
      row: 60,
      rowspan: 3,
      y: 800,
      anchor: { row: 40, col: 3 },
    });

    expect(spans.get(61)?.get('d')).toEqual({ kind: 'covered' });
    expect(spans.get(63)).toBeUndefined();
  });

  it('keeps the spans of a row by identity while the window moves past it unchanged', () => {
    const index = createMergeIndex(MERGES, BOUNDS);
    const before = mergeSpans(index.within(0, 9), [[0, 1, 2, 3, 4, 5]], SLOTS, geometry).spans;
    const moved = mergeSpans(index.within(0, 9), [[2, 3, 4, 5, 6]], SLOTS, geometry).spans;
    const kept = keepSpans(moved, before);

    expect(kept.get(5)).toBe(before.get(5));
    expect(kept.get(3)).toBe(before.get(3));
    expect(kept.get(2)).toBe(moved.get(2));
    expect(kept.get(2)).not.toBe(before.get(2));
    expect(kept.get(1)).toBeUndefined();
    expect(keepSpans(moved, undefined)).toBe(moved);
  });
});
