import { describe, expect, it } from 'vite-plus/test';
import { textValue, type CellEdit, type WorkbookStep } from '../src/core';
import { foreignEdits, touchedOver, yieldPass, yieldStep } from '../src/core/collab/yield-step';

const SHEET = 'Sheet1';

const text = (row: number, col: number, value: string): CellEdit => ({
  row,
  col,
  content: { kind: 'value', value: textValue(value) },
});

const cellsOn = (sheet: string, ...edits: readonly CellEdit[]): WorkbookStep => ({
  kind: 'setCells',
  sheet,
  cells: edits,
});

const cells = (...edits: readonly CellEdit[]): WorkbookStep => cellsOn(SHEET, ...edits);

const insertRow = (at: number): WorkbookStep => ({
  kind: 'insertLines',
  sheet: SHEET,
  axis: 'rows',
  at,
  count: 1,
});

const deleteRows = (at: number, count: number): WorkbookStep => ({
  kind: 'deleteLines',
  sheet: SHEET,
  axis: 'rows',
  at,
  count,
});

describe('yield of an undo step to the edits of other authors', () => {
  it('keeps a step no one else has touched as it is', () => {
    const mine = cells(text(0, 0, 'old'));

    expect(yieldStep(mine, [cells(text(5, 5, 'theirs'))])).toBe(mine);
    expect(yieldStep(mine, [cellsOn('Other', text(0, 0, 'theirs'))])).toBe(mine);
  });

  it('drops only the cells and the fields someone else has written', () => {
    const mine: WorkbookStep = {
      kind: 'batch',
      steps: [
        cells(text(0, 0, 'old'), { ...text(0, 1, 'old'), format: '0.00' }, text(0, 2, 'old')),
        cells(text(3, 3, 'old')),
      ],
    };

    const theirs = [
      cells(text(0, 2, 'theirs'), { row: 0, col: 1, format: '0%' }),
      cellsOn('sheet1', text(3, 3, 'theirs')),
    ];

    expect(yieldStep(mine, theirs)).toEqual({
      kind: 'batch',
      steps: [cells(text(0, 0, 'old'), { ...text(0, 1, 'old'), format: undefined })],
    });
  });

  it('gives a whole step up when every cell of it was rewritten', () => {
    expect(yieldStep(cells(text(0, 0, 'old')), [cells(text(0, 0, 'theirs'))])).toBeUndefined();
  });

  it('leaves the format of a cell inside a range someone else has formatted', () => {
    const mine = cells({ row: 1, col: 1, format: '0.00' }, { row: 9, col: 9, format: '0.00' });

    const theirs: WorkbookStep[] = [
      {
        kind: 'setFormat',
        sheet: SHEET,
        range: { top: 0, left: 0, bottom: 2, right: 2 },
        format: '0%',
      },
    ];

    expect(yieldStep(mine, theirs)).toEqual(cells({ row: 9, col: 9, format: '0.00' }));
  });

  it('gives up a deletion of rows someone else has written into and moves the older steps past them', () => {
    const theirs = { touched: [cells(text(3, 0, 'theirs'))], kept: [] };
    const removal: WorkbookStep = { kind: 'batch', steps: [deleteRows(3, 2)] };

    const newest = yieldPass(theirs, removal);
    const older = yieldPass(newest.state, cells(text(9, 0, 'before')));

    expect(newest.step).toBeUndefined();
    expect(older.step).toEqual(cells(text(11, 0, 'before')));
  });

  it('keeps a deletion of rows no one else has written into', () => {
    const removal: WorkbookStep = { kind: 'batch', steps: [deleteRows(3, 2)] };

    const cleared = yieldPass(
      { touched: [cells({ row: 3, col: 0, content: { kind: 'empty' } })], kept: [] },
      removal,
    );

    const beside = yieldPass({ touched: [cells(text(5, 0, 'theirs'))], kept: [] }, removal);

    expect(cleared.step).toBe(removal);
    expect(beside.step).toBe(removal);
    expect(beside.state.touched).toEqual([cells(text(3, 0, 'theirs'))]);
  });

  it('reads the edits of a pack in the rows the book has after the pack and the own steps', () => {
    const edits = foreignEdits(
      [cells(text(2, 0, 'first')), insertRow(0), cells(text(0, 0, 'second'))],
      [insertRow(0)],
    );

    expect(edits).toEqual([cells(text(4, 0, 'first')), cells(text(1, 0, 'second'))]);

    expect(touchedOver(edits, insertRow(1))).toEqual([
      cells(text(5, 0, 'first')),
      cells(text(2, 0, 'second')),
    ]);
  });
});
