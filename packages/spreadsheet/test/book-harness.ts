import {
  EN_LOCALE,
  createCalculator,
  createCellEditor,
  createStepper,
  createWorkbook,
  createWorkbookHistory,
  formatRange,
  columnIndex,
  parseCell,
  parseRange,
  type Sheet,
  type TableOptions,
  type WorkbookStep,
} from '../src/core';

const at = (address: string): { readonly row: number; readonly col: number } => {
  const cell = parseCell(address);

  if (cell === undefined) {
    throw new Error(`${address} is not a cell`);
  }
  return cell;
};

const rangeAt = (address: string) => {
  const range = parseRange(address);

  if (range === undefined) {
    throw new Error(`${address} is not a range`);
  }
  return range;
};

const columnAt = (letters: string): number => {
  const index = columnIndex(letters);

  if (index === undefined) {
    throw new Error(`${letters} is not a column`);
  }
  return index;
};

const lines = (
  kind: 'insertLines' | 'deleteLines',
  line: string,
  count: number,
  sheet: string,
): WorkbookStep =>
  /^\d+$/u.test(line)
    ? { kind, sheet, axis: 'rows', at: Number(line) - 1, count }
    : { kind, sheet, axis: 'cols', at: columnAt(line), count };

export const openBook = (locale = EN_LOCALE) => {
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
    calculator,
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
    settled: (address: string, sheet = 'Sheet1'): string => {
      const { row, col } = at(address);

      calculator.recalculate({ budgetMs: Number.POSITIVE_INFINITY, volatile: false });
      return editor.shown(sheetNamed(sheet), row, col).text;
    },
    input: (address: string, sheet = 'Sheet1'): string => {
      const { row, col } = at(address);

      return editor.inputText(sheetNamed(sheet), row, col);
    },
    table: (range: string, options?: TableOptions, sheet = 'Sheet1') =>
      history.commit([editor.tableStep(sheetNamed(sheet), rangeAt(range), options)]),
    tableOf: (name: string) => {
      const table = book.tables.get(name);

      return table === undefined
        ? undefined
        : {
            name: table.name,
            sheet: table.sheet.name,
            range: formatRange(table.range),
            columns: table.columns.join(', '),
            headers: table.headers,
            totals: table.totals,
          };
    },
    insert: (line: string, count = 1, sheet = 'Sheet1') =>
      history.commit([lines('insertLines', line, count, sheet)]),
    remove: (line: string, count = 1, sheet = 'Sheet1') =>
      history.commit([lines('deleteLines', line, count, sheet)]),
    definition: (name: string, scope?: string, anchor?: string) =>
      editor.nameText(
        name,
        scope === undefined ? undefined : sheetNamed(scope),
        anchor === undefined ? undefined : at(anchor),
      ),
  };
};
