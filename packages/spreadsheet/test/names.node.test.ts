import { describe, expect, it } from 'vite-plus/test';
import {
  EN_LOCALE,
  RU_LOCALE,
  createCalculator,
  createCellEditor,
  createStepper,
  createWorkbook,
  createWorkbookHistory,
  parseCell,
  validDefinedName,
  type Sheet,
  type WorkbookStep,
} from '../src/core';

const at = (address: string): { readonly row: number; readonly col: number } => {
  const cell = parseCell(address);

  if (cell === undefined) {
    throw new Error(`${address} is not a cell`);
  }
  return cell;
};

const openBook = (locale = EN_LOCALE) => {
  const book = createWorkbook();
  const first = book.addSheet('Sheet1');
  const rates = book.addSheet('Rates');
  const calculator = createCalculator(book, { locale });
  const editor = createCellEditor(book, calculator);
  const history = createWorkbookHistory(createStepper(book, calculator), { limit: 10 });

  const sheetNamed = (name: string): Sheet => {
    const found = book.sheet(name);

    if (found === undefined) {
      throw new Error(`${name} is missing`);
    }
    return found;
  };

  const committed = (step: WorkbookStep): void => {
    const outcome = history.commit([step]);

    if (!outcome.ok) {
      throw new Error(`The step was refused: ${outcome.reason}`);
    }
  };

  return {
    book,
    first,
    rates,
    history,
    type: (address: string, text: string, sheet = 'Sheet1'): void => {
      const { row, col } = at(address);
      const result = editor.input(sheetNamed(sheet), row, col, text);

      if (!result.ok) {
        throw new Error(`${text} does not parse`);
      }
      committed(result.step);
    },
    name: (name: string, text: string, sheet = 'Sheet1', scope?: string, anchor?: string) => {
      const result = editor.nameStep(name, text, sheetNamed(sheet), {
        scope: scope === undefined ? undefined : sheetNamed(scope),
        anchor: anchor === undefined ? undefined : at(anchor),
      });

      if (!result.ok) {
        throw new Error(`${text} does not parse`);
      }
      return history.commit([result.step]);
    },
    commit: (step: WorkbookStep) => history.commit([step]),
    shown: (address: string, sheet = 'Sheet1'): string => {
      const { row, col } = at(address);

      calculator.recalculate({ budgetMs: Number.POSITIVE_INFINITY });
      return editor.shown(sheetNamed(sheet), row, col).text;
    },
    input: (address: string, sheet = 'Sheet1'): string => {
      const { row, col } = at(address);

      return editor.inputText(sheetNamed(sheet), row, col);
    },
    definition: (name: string, scope?: string, anchor?: string) =>
      editor.nameText(
        name,
        scope === undefined ? undefined : sheetNamed(scope),
        anchor === undefined ? undefined : at(anchor),
      ),
  };
};

describe('defined names', () => {
  it('reads a book name in formulas and recalculates when the named cell changes', () => {
    const sheet = openBook();

    sheet.type('B1', '0.2', 'Rates');
    sheet.type('A1', '100');
    sheet.name('Rate', '=Rates!$B$1');
    sheet.type('A2', '=A1*rate');

    expect(sheet.shown('A2')).toBe('20');
    expect(sheet.input('A2')).toBe('=A1*rate');
    expect(sheet.definition('RATE')).toBe('=Rates!$B$1');

    sheet.type('B1', '0.25', 'Rates');

    expect(sheet.shown('A2')).toBe('25');
  });

  it('answers #NAME? until the name exists and follows it when it is redefined or removed', () => {
    const sheet = openBook();

    sheet.type('A1', '=Total*2');
    sheet.type('B1', '5');

    expect(sheet.shown('A1')).toBe('#NAME?');

    sheet.name('Total', '=$B$1');

    expect(sheet.shown('A1')).toBe('10');

    sheet.name('Total', '=$B$1+1');

    expect(sheet.shown('A1')).toBe('12');

    sheet.name('Total', '');

    expect(sheet.shown('A1')).toBe('#NAME?');

    sheet.history.undo();

    expect(sheet.shown('A1')).toBe('12');
  });

  it('prefers the name of the formula sheet and reads another sheet name through its prefix', () => {
    const sheet = openBook();

    sheet.name('Level', '=1');
    sheet.name('Level', '=2', 'Rates', 'Rates');
    sheet.type('A1', '=Level');
    sheet.type('A1', '=Level', 'Rates');
    sheet.type('A2', '=Rates!Level*10');

    expect(sheet.shown('A1')).toBe('1');
    expect(sheet.shown('A1', 'Rates')).toBe('2');
    expect(sheet.shown('A2')).toBe('20');
    expect(sheet.input('A2')).toBe('=Rates!Level*10');
  });

  it('sums a named range and reads relative names from the cell that uses them', () => {
    const sheet = openBook();

    sheet.type('A1', '1');
    sheet.type('A2', '2');
    sheet.type('A3', '3');
    sheet.name('Values', '=$A$1:$A$3');
    sheet.name('Above', '=B1', 'Sheet1', undefined, 'B2');
    sheet.type('B4', '=SUM(Values)');
    sheet.type('C2', '7');
    sheet.type('C3', '=Above*2');

    expect(sheet.shown('B4')).toBe('6');
    expect(sheet.shown('C3')).toBe('14');
    expect(sheet.definition('Above', undefined, 'B2')).toBe('=Sheet1!B1');
    expect(sheet.definition('Above', undefined, 'D9')).toBe('=Sheet1!D8');
  });

  it('chains names and breaks a name that reaches itself', () => {
    const sheet = openBook();

    sheet.type('A1', '4');
    sheet.name('Base', '=$A$1');
    sheet.name('Twice', '=Base*2');
    sheet.name('Loop', '=Loop+1');
    sheet.type('B1', '=Twice');
    sheet.type('B2', '=Loop');

    expect(sheet.shown('B1')).toBe('8');
    expect(sheet.shown('B2')).toBe('#REF!');

    sheet.type('A1', '5');

    expect(sheet.shown('B1')).toBe('10');
  });

  it('moves name definitions with inserted and deleted rows and brings them back on undo', () => {
    const sheet = openBook();

    sheet.type('A2', '1');
    sheet.type('A3', '2');
    sheet.name('Values', '=$A$2:$A$3');
    sheet.name('Head', '=$A$2');
    sheet.type('C1', '=SUM(Values)+Head');

    sheet.commit({ kind: 'insertLines', sheet: 'Sheet1', axis: 'rows', at: 0, count: 1 });

    expect(sheet.definition('Values')).toBe('=Sheet1!$A$3:$A$4');
    expect(sheet.shown('C2')).toBe('4');

    sheet.commit({ kind: 'deleteLines', sheet: 'Sheet1', axis: 'rows', at: 2, count: 1 });

    expect(sheet.definition('Head')).toBe('=#REF!');
    expect(sheet.shown('C2')).toBe('#REF!');

    sheet.history.undo();

    expect(sheet.definition('Head')).toBe('=Sheet1!$A$3');
    expect(sheet.shown('C2')).toBe('4');
  });

  it('renames definitions with the sheet, drops the names of a removed sheet and restores them', () => {
    const sheet = openBook();

    sheet.type('B1', '3', 'Rates');
    sheet.name('Rate', '=Rates!$B$1');
    sheet.name('Local', '=1', 'Rates', 'Rates');
    sheet.type('A1', '=Rate');

    sheet.commit({ kind: 'renameSheet', from: 'Rates', to: 'Prices' });

    expect(sheet.definition('Rate')).toBe('=Prices!$B$1');
    expect(sheet.shown('A1')).toBe('3');

    sheet.commit({ kind: 'removeSheet', name: 'Prices' });

    expect(sheet.definition('Rate')).toBe('=#REF!');
    expect(sheet.shown('A1')).toBe('#REF!');

    sheet.history.undo();

    expect(sheet.definition('Rate')).toBe('=Prices!$B$1');
    expect(sheet.definition('Local', 'Prices')).toBe('=1');
    expect(sheet.shown('A1')).toBe('3');
  });

  it('refuses names that Excel refuses and reads definitions in the book locale', () => {
    expect(['Rate', 'ставка', '_x.1', 'Tax_2024'].every(validDefinedName)).toBe(true);

    expect(['A1', 'r1c1', 'R', 'TRUE', '1x', 'a b', 'XFD1', 'Tax2024'].some(validDefinedName)).toBe(
      false,
    );

    const sheet = openBook(RU_LOCALE);

    expect(sheet.name('A1', '=1')).toEqual({ ok: false, reason: 'invalid-name' });

    sheet.type('A1', '2');
    sheet.name('Ставка', '=IF($A$1>1;0,5;0)');
    sheet.type('B1', '=Ставка*4');

    expect(sheet.shown('B1')).toBe('2');
    expect(sheet.definition('ставка')).toBe('=IF(Sheet1!$A$1>1;0,5;0)');
  });
});
