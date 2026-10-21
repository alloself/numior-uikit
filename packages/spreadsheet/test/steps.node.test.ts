import { describe, expect, it } from 'vite-plus/test';
import {
  EN_LOCALE,
  createCalculator,
  createCellEditor,
  createStepper,
  createWorkbook,
  createWorkbookHistory,
  mapCell,
  parseCell,
  parseFormula,
  parseRange,
  printFormula,
  type LineChange,
  type WorkbookStep,
} from '../src/core';
import { dropSheetFromFormula, renameInFormula, shiftFormula } from '../src/core/formula/rewrite';

const rewritten = (
  formula: string,
  rewrite: (ast: Parameters<typeof printFormula>[0]) => Parameters<typeof printFormula>[0],
): string => {
  const parsed = parseFormula(formula);

  if (!parsed.ok) {
    throw new Error(`${formula} does not parse`);
  }
  return `=${printFormula(rewrite(parsed.ast))}`;
};

const shifted = (formula: string, change: LineChange, home = 'Sheet1'): string =>
  rewritten(formula, (ast) => shiftFormula(ast, change, home));

const rowsAt = (row: number, count: number): LineChange => ({
  sheet: 'Sheet1',
  axis: 'rows',
  at: row - 1,
  count,
});

const at = (address: string): { readonly row: number; readonly col: number } => {
  const cell = parseCell(address);

  if (cell === undefined) {
    throw new Error(`${address} is not a cell`);
  }
  return cell;
};

const openBook = () => {
  const book = createWorkbook();
  const first = book.addSheet('Sheet1');
  const second = book.addSheet('Rates');
  const calculator = createCalculator(book, { locale: EN_LOCALE });
  const editor = createCellEditor(book, calculator);
  const history = createWorkbookHistory(createStepper(book, calculator), { limit: 3 });

  const sheetNamed = (name: string) => {
    const found = book.sheet(name);

    if (found === undefined) {
      throw new Error(`${name} is missing`);
    }
    return found;
  };

  return {
    book,
    history,
    calculator,
    first,
    second,
    type: (address: string, text: string, sheet = 'Sheet1'): void => {
      const { row, col } = at(address);
      const result = editor.input(sheetNamed(sheet), row, col, text);

      if (!result.ok) {
        throw new Error(`${text} does not parse`);
      }
      history.commit([result.step]);
    },
    commit: (...steps: WorkbookStep[]) => history.commit(steps),
    shown: (address: string, sheet = 'Sheet1'): string => {
      const { row, col } = at(address);

      calculator.recalculate({ budgetMs: Number.POSITIVE_INFINITY });
      return editor.shown(sheetNamed(sheet), row, col).text;
    },
    input: (address: string, sheet = 'Sheet1'): string => {
      const { row, col } = at(address);

      return editor.inputText(sheetNamed(sheet), row, col);
    },
    format: (address: string): string => {
      const { row, col } = at(address);

      return editor.formatAt(first, row, col);
    },
    formatRange: (range: string, code: string): WorkbookStep => {
      const found = parseRange(range);

      if (found === undefined) {
        throw new Error(`${range} is not a range`);
      }
      return editor.formatStep(first, found, code);
    },
  };
};

describe('reference rewriting', () => {
  it('moves references below inserted rows and widens ranges across them', () => {
    expect(shifted('=A1+A5', rowsAt(4, 2))).toBe('=A1+A7');
    expect(shifted('=SUM(A2:A10)', rowsAt(4, 2))).toBe('=SUM(A2:A12)');
    expect(shifted('=SUM(A5:A10)', rowsAt(4, 2))).toBe('=SUM(A7:A12)');
    expect(shifted('=SUM(A1:A3)', rowsAt(4, 2))).toBe('=SUM(A1:A3)');
    expect(shifted('=SUM($B$9:B4)', rowsAt(4, 1))).toBe('=SUM($B$10:B5)');
    expect(shifted('=SUM(A:A)', rowsAt(4, 2))).toBe('=SUM(A:A)');
    expect(shifted('=SUM(5:7)', rowsAt(4, 2))).toBe('=SUM(7:9)');
    expect(shifted('=Rates!A5', rowsAt(4, 2))).toBe('=Rates!A5');
    expect(shifted('=Sheet1!A5+A5', rowsAt(4, 2), 'Rates')).toBe('=Sheet1!A7+A5');
    expect(shifted('=A1048576', rowsAt(4, 1))).toBe('=#REF!');
  });

  it('breaks references into deleted rows and pulls the rest up', () => {
    expect(shifted('=A4+A7', rowsAt(4, -2))).toBe('=#REF!+A5');
    expect(shifted('=SUM(A2:A10)', rowsAt(4, -2))).toBe('=SUM(A2:A8)');
    expect(shifted('=SUM(A4:A5)', rowsAt(4, -2))).toBe('=SUM(#REF!)');
    expect(shifted('=SUM(A4:A8)', rowsAt(4, -2))).toBe('=SUM(A4:A6)');
    expect(shifted('=SUM(A1:A4)', rowsAt(4, -2))).toBe('=SUM(A1:A3)');
  });

  it('shifts columns, renames sheets and breaks references to a removed sheet', () => {
    expect(shifted('=A1+B1+C1', { sheet: 'Sheet1', axis: 'cols', at: 1, count: 1 })).toBe(
      '=A1+C1+D1',
    );

    expect(rewritten('=Rates!A1*2', (ast) => renameInFormula(ast, 'rates', 'Prices'))).toBe(
      '=Prices!A1*2',
    );

    expect(rewritten('=Rates!A1*A1', (ast) => dropSheetFromFormula(ast, 'Rates'))).toBe(
      '=#REF!*A1',
    );
  });

  it('maps positions through the changes of a step', () => {
    const changes = [rowsAt(4, 2), { ...rowsAt(1, -1), sheet: 'sheet1' }];

    expect(mapCell(changes, 'Sheet1', at('B5'))).toEqual(at('B6'));
    expect(mapCell(changes, 'Sheet1', at('B1'))).toBeUndefined();
    expect(mapCell(changes, 'Rates', at('B5'))).toEqual(at('B5'));
  });
});

describe('workbook steps and history', () => {
  it('inserts rows with values, formulas and formats, and undoes and redoes them', () => {
    const book = openBook();

    book.type('A1', '10');
    book.type('A2', '20');
    book.type('A3', '=SUM(A1:A2)');
    book.type('B1', '=A2*2');
    book.type('A1', '12%');
    book.type('C1', '=A2', 'Rates');

    book.commit({ kind: 'insertLines', sheet: 'Sheet1', axis: 'rows', at: 1, count: 2 });

    expect(book.input('A5')).toBe('=SUM(A1:A4)');
    expect(book.shown('A5')).toBe('20.12');
    expect(book.input('B1')).toBe('=A4*2');
    expect(book.shown('A4')).toBe('20');
    expect(book.format('A1')).toBe('0%');
    expect(book.input('C1', 'Rates')).toBe('=A2');

    book.type('A2', '=Rates!C1');

    expect(book.history.undo()).toMatchObject({ ok: true });

    expect(book.history.undo()).toMatchObject({
      ok: true,
      changes: [{ axis: 'rows', at: 1, count: -2 }],
    });

    expect(book.input('A3')).toBe('=SUM(A1:A2)');
    expect(book.shown('A3')).toBe('20.12');
    expect(book.input('B1')).toBe('=A2*2');

    expect(book.history.redo()).toMatchObject({ ok: true });
    expect(book.input('A5')).toBe('=SUM(A1:A4)');
    expect(book.history.canRedo).toBe(true);
  });

  it('restores deleted cells and broken formulas when a deletion is undone', () => {
    const book = openBook();

    book.type('A1', '1');
    book.type('A2', '2');
    book.type('A3', '3');
    book.type('B1', '=A2+A3');
    book.type('B2', '=SUM(A1:A3)');
    book.type('D1', '=Sheet1!A3', 'Rates');

    book.commit({ kind: 'deleteLines', sheet: 'Sheet1', axis: 'rows', at: 1, count: 1 });

    expect(book.input('B1')).toBe('=#REF!+A2');
    expect(book.shown('B1')).toBe('#REF!');
    expect(book.input('B1')).toBe('=#REF!+A2');
    expect(book.input('A2')).toBe('3');
    expect(book.input('D1', 'Rates')).toBe('=Sheet1!A2');

    book.history.undo();

    expect(book.input('B1')).toBe('=A2+A3');
    expect(book.input('B2')).toBe('=SUM(A1:A3)');
    expect(book.shown('B2')).toBe('6');
    expect(book.input('A2')).toBe('2');
    expect(book.input('D1', 'Rates')).toBe('=Sheet1!A3');
  });

  it('moves spilled arrays with their anchor', () => {
    const book = openBook();

    book.type('B2', '=SEQUENCE(3)');
    book.commit({ kind: 'insertLines', sheet: 'Sheet1', axis: 'rows', at: 0, count: 1 });

    expect([book.shown('B3'), book.shown('B4'), book.shown('B5'), book.shown('B2')]).toEqual([
      '1',
      '2',
      '3',
      '',
    ]);
  });

  it('refuses an insertion that would push content off the sheet', () => {
    const book = openBook();

    book.type('A1048576', 'last');

    expect(
      book.commit({ kind: 'insertLines', sheet: 'Sheet1', axis: 'rows', at: 0, count: 1 }),
    ).toEqual({
      ok: false,
      reason: 'sheet-full',
    });

    expect(
      book.commit({ kind: 'insertLines', sheet: 'Nowhere', axis: 'rows', at: 0, count: 1 }),
    ).toEqual({
      ok: false,
      reason: 'missing-sheet',
    });
  });

  it('inserts and deletes columns', () => {
    const book = openBook();

    book.type('A1', '2');
    book.type('B1', '3');
    book.type('C1', '=A1*B1');
    book.commit({ kind: 'insertLines', sheet: 'Sheet1', axis: 'cols', at: 1, count: 1 });

    expect(book.input('D1')).toBe('=A1*C1');
    expect(book.shown('D1')).toBe('6');

    book.commit({ kind: 'deleteLines', sheet: 'Sheet1', axis: 'cols', at: 0, count: 1 });

    expect(book.input('C1')).toBe('=#REF!*B1');
  });

  it('renames, adds and removes sheets with their references', () => {
    const book = openBook();

    book.type('A1', '5', 'Rates');
    book.type('A1', '=Rates!A1*2');
    book.type('A2', '=Later!A1');

    book.commit({ kind: 'renameSheet', from: 'Rates', to: 'Prices' });

    expect(book.input('A1')).toBe('=Prices!A1*2');
    expect(book.shown('A1')).toBe('10');

    book.commit({ kind: 'addSheet', name: 'Later', index: 2 });
    book.type('A1', '7', 'Later');

    expect(book.shown('A2')).toBe('7');

    book.commit({ kind: 'removeSheet', name: 'Prices' });

    expect(book.book.sheets.map((sheet) => sheet.name)).toEqual(['Sheet1', 'Later']);
    expect(book.input('A1')).toBe('=#REF!*2');

    book.history.undo();

    expect(book.book.sheets.map((sheet) => sheet.name)).toEqual(['Sheet1', 'Prices', 'Later']);
    expect(book.input('A1')).toBe('=Prices!A1*2');
    expect(book.shown('A1')).toBe('10');

    expect(book.commit({ kind: 'renameSheet', from: 'Prices', to: 'later' })).toEqual({
      ok: false,
      reason: 'name-taken',
    });
  });

  it('restores formats a range change replaced and keeps the history within its limit', () => {
    const book = openBook();

    book.type('A1', '12%');
    book.commit(book.formatRange('A1:A2', '#,##0.00'));

    expect(book.format('A1')).toBe('#,##0.00');

    book.history.undo();

    expect(book.format('A1')).toBe('0%');
    expect(book.format('A2')).toBe('General');

    book.type('B1', '1');
    book.type('B2', '2');
    book.type('B3', '3');
    book.type('B4', '4');

    expect(book.history.canRedo).toBe(false);

    expect(
      [book.history.undo(), book.history.undo(), book.history.undo()].every(
        (outcome) => outcome?.ok,
      ),
    ).toBe(true);

    expect(book.history.undo()).toBeUndefined();
    expect(book.input('B1')).toBe('1');

    book.history.clear();

    expect(book.history.canUndo).toBe(false);
  });

  it('rolls a batch back when one of its steps is refused', () => {
    const book = openBook();

    book.type('A1', '1');

    expect(
      book.commit(
        { kind: 'insertLines', sheet: 'Sheet1', axis: 'rows', at: 0, count: 1 },
        { kind: 'removeSheet', name: 'Nowhere' },
      ),
    ).toEqual({ ok: false, reason: 'missing-sheet' });

    expect(book.input('A1')).toBe('1');
    expect(book.commit({ kind: 'removeSheet', name: 'Rates' })).toMatchObject({ ok: true });

    expect(book.commit({ kind: 'removeSheet', name: 'Sheet1' })).toEqual({
      ok: false,
      reason: 'last-sheet',
    });
  });
});
