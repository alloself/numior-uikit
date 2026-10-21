import {
  EN_LOCALE,
  RU_LOCALE,
  createCalculator,
  createCellEditor,
  createStepper,
  createWorkbookHistory,
  createWorkbook,
  currencyFormat,
  formatColor,
  formulaReferences,
  parseCell,
  parseFormula,
  parseRange,
  rangeOf,
  textValue,
  type BookLocale,
  type CellRange,
  type CellValue,
  type FormulaReference,
  type LineAxis,
  type StepOutcome,
  type WorkbookStep,
  type NumberLocale,
  type Sheet,
} from '@numior/spreadsheet/core';
import type { NuiTableCellStyle, NuiTableRange } from '@numior/table';

export const FORMULA_ROWS = 50_000;
export const FORMULA_COLS = 26;
const LOAD_ROWS = 20_000;

const BUDGET: readonly (readonly [string, string | number])[] = [
  ['A1', 'Статья'],
  ['B1', 'Кол-во'],
  ['C1', 'Цена'],
  ['D1', 'Сумма'],
  ['E1', 'В долларах'],
  ['F1', 'Размер'],
  ['A2', 'Ноутбуки'],
  ['B2', 4],
  ['C2', 85_000],
  ['A3', 'Мониторы'],
  ['B3', 6],
  ['C3', 21_000],
  ['A4', 'Кресла'],
  ['B4', 8],
  ['C4', 14_500],
  ['A5', 'Лицензии'],
  ['B5', 12],
  ['C5', 6900],
  ['A6', 'Обучение'],
  ['B6', 1],
  ['C6', 120_000],
  ['A8', 'Итого'],
  ['D8', '=SUM(D2:D6)'],
  ['E8', '=SUM(E2:E6)'],
  ['A9', 'Средняя'],
  ['D9', '=AVERAGE(D2:D6)'],
  ['A10', 'Дороже 50 000'],
  ['D10', '=COUNTIF(D2:D6,">50000")'],
  ['A12', 'Статьи'],
  ['B12', '=TEXTJOIN(", ",TRUE,A2:A6)'],
  ['A14', 'Квадраты'],
  ['B14', '=SEQUENCE(1,5)^2'],
  ['A15', 'Случайное'],
  ['B15', '=RANDBETWEEN(1,100)'],
  ['A16', 'Сегодня'],
  ['B16', '=TODAY()'],
  ['A17', 'Через квартал'],
  ['B17', '=EDATE(B16,3)'],
  ['A18', 'Доля ноутбуков'],
  ['B18', '=D2/D8'],
  ['A19', 'Платёж в месяц'],
  ['B19', '=PMT(12%/12,24,D8)'],
];

const RATES: readonly (readonly [string, string | number])[] = [
  ['A1', 'Валюта'],
  ['B1', 'Курс'],
  ['A2', 'USD'],
  ['B2', 92.4],
  ['A3', 'EUR'],
  ['B3', 100.6],
  ['A4', 'CNY'],
  ['B4', 12.8],
];

const HEAD: NuiTableCellStyle = {
  fill: 'var(--nui-surface-muted)',
  style: { 'font-weight': 'var(--nui-font-weight-semibold)' },
};

const ALIGN: Readonly<Record<CellValue['kind'], NuiTableCellStyle['align']>> = {
  number: 'end',
  boolean: 'center',
  error: 'center',
  string: undefined,
  empty: undefined,
};

const cellStyle = (
  value: CellValue,
  stale: boolean,
  color: number | undefined,
): NuiTableCellStyle => ({
  align: ALIGN[value.kind],
  color: stale ? 'var(--nui-text-muted)' : color === undefined ? undefined : formatColor(color),
  overflow: value.kind === 'string',
});

const referenceRange = (found: FormulaReference): CellRange | undefined => {
  switch (found.kind) {
    case 'range':
      return rangeOf(found.from, found.to);
    case 'cell':
    case 'spill':
      return rangeOf(found.ref, found.ref);
    default:
      return undefined;
  }
};

const rowFormulas = (row: number): readonly (readonly [string, string])[] => {
  const at = String(row + 1);

  return [
    [`D${at}`, `=B${at}*C${at}`],
    [`E${at}`, `=ROUND(D${at}/VLOOKUP("USD",Курсы!$A$2:$B$4,2,FALSE),2)`],
    [`F${at}`, `=IF(D${at}>=100000,"крупная","обычная")`],
  ];
};

const asRange = (range: CellRange): NuiTableRange => ({
  from: { row: range.top, col: range.left },
  to: { row: range.bottom, col: range.right },
});

const onSheet = (sheet: Sheet, name: string | undefined): boolean =>
  name === undefined || name === sheet.name;

const visibleRange = (sheet: Sheet, found: FormulaReference): NuiTableRange[] => {
  const range = referenceRange(found);

  return range !== undefined && found.kind !== 'name' && onSheet(sheet, found.sheet)
    ? [asRange(range)]
    : [];
};

export type FormatPreset =
  | 'general'
  | 'number'
  | 'money'
  | 'percent'
  | 'date'
  | 'time'
  | 'datetime'
  | 'fraction'
  | 'scientific'
  | 'text';

const PRESET_CODES: Readonly<Record<FormatPreset, (locale: NumberLocale) => string>> = {
  general: () => 'General',
  number: () => '#,##0.00',
  money: (locale) => currencyFormat(locale, 2),
  percent: () => '0.00%',
  date: (locale) => locale.shortDate,
  time: (locale) => locale.longTime,
  datetime: (locale) => `${locale.shortDate} ${locale.shortTime}`,
  fraction: () => '# ?/?',
  scientific: () => '0.00E+00',
  text: () => '@',
};

export const presetCode = (preset: FormatPreset, locale: NumberLocale): string =>
  PRESET_CODES[preset](locale);

const FORMATS: readonly (readonly [string, string])[] = [
  ['C2:D9', currencyFormat(RU_LOCALE.numbers, 2)],
  ['E2:E8', '"$"#,##0.00'],
  ['B18', '0.0%'],
];

interface FormulaEntry {
  readonly row: number;
  readonly col: number;
  readonly text: string;
}

interface EntryStep {
  readonly step: WorkbookStep;
  readonly problem: string | undefined;
}

export const createFormulaBook = () => {
  const workbook = createWorkbook();
  const budget = workbook.addSheet('Бюджет');
  const rates = workbook.addSheet('Курсы');
  const load = workbook.addSheet('Нагрузка');
  const calculator = createCalculator(workbook, { locale: RU_LOCALE });
  const editor = createCellEditor(workbook, calculator);
  const history = createWorkbookHistory(createStepper(workbook, calculator));

  const staleAt = (sheet: Sheet, row: number, col: number): boolean =>
    calculator.formulaAt(sheet, row, col)?.state === 'stale';

  const entryOf = (sheet: Sheet, entry: FormulaEntry): EntryStep => {
    const result = editor.input(sheet, entry.row, entry.col, entry.text);

    if (result.ok) {
      return { step: result.step, problem: undefined };
    }
    return {
      step: {
        kind: 'setCells',
        sheet: sheet.name,
        cells: [
          {
            row: entry.row,
            col: entry.col,
            content: { kind: 'value', value: textValue(entry.text) },
          },
        ],
      },
      problem: `символ ${String(result.error.position + 1)}`,
    };
  };

  const enter = (
    sheet: Sheet,
    entries: readonly FormulaEntry[],
  ): readonly (string | undefined)[] => {
    const results = entries.map((entry) => entryOf(sheet, entry));

    history.commit(results.map((result) => result.step));
    return results.map((result) => result.problem);
  };

  const lines = (
    kind: 'insertLines' | 'deleteLines',
    sheet: Sheet,
    axis: LineAxis,
    at: number,
    count: number,
  ): StepOutcome => history.commit([{ kind, sheet: sheet.name, axis, at, count }]);

  const place = (sheet: Sheet, entries: readonly (readonly [string, string | number])[]): void => {
    entries.forEach(([address, input]) => {
      const cell = parseCell(address);

      if (cell !== undefined) {
        editor.enter(sheet, cell.row, cell.col, String(input), EN_LOCALE);
      }
    });
  };

  FORMATS.forEach(([address, code]) => {
    const range = parseRange(address);

    if (range !== undefined) {
      editor.setFormat(budget, range, code);
    }
  });

  place(rates, RATES);
  place(budget, BUDGET);
  for (let row = 1; row <= 5; row += 1) {
    place(budget, rowFormulas(row));
  }

  return {
    calculator,
    sheets: [budget, rates, load],
    enter,
    inputAt: (sheet: Sheet, row: number, col: number): string => editor.inputText(sheet, row, col),
    displayAt: (sheet: Sheet, row: number, col: number): string =>
      editor.shown(sheet, row, col).text,
    formatAt: (sheet: Sheet, row: number, col: number): string => editor.formatAt(sheet, row, col),
    applyFormat: (sheet: Sheet, ranges: readonly CellRange[], code: string): void => {
      history.commit(ranges.map((range) => editor.formatStep(sheet, range, code)));
    },
    insertLines: (sheet: Sheet, axis: LineAxis, at: number, count: number): StepOutcome =>
      lines('insertLines', sheet, axis, at, count),
    deleteLines: (sheet: Sheet, axis: LineAxis, at: number, count: number): StepOutcome =>
      lines('deleteLines', sheet, axis, at, count),
    undo: (): StepOutcome | undefined => history.undo(),
    redo: (): StepOutcome | undefined => history.redo(),
    setLocale: (locale: BookLocale): void => {
      calculator.setLocale(locale);
    },
    styleAt: (sheet: Sheet, row: number, col: number): NuiTableCellStyle => {
      const value = sheet.cells.get(row, col);

      return row === 0 && value.kind === 'string'
        ? HEAD
        : cellStyle(value, staleAt(sheet, row, col), editor.shown(sheet, row, col).color);
    },
    referencesOf: (sheet: Sheet, text: string): NuiTableRange[] => {
      const parsed = parseFormula(text, calculator.locale.formulas);

      return parsed.ok
        ? formulaReferences(parsed.ast).flatMap((found) => visibleRange(sheet, found))
        : [];
    },
    fillLoad: (): Sheet => {
      for (let row = 0; row < LOAD_ROWS; row += 1) {
        const at = String(row + 1);

        editor.enter(load, row, 0, String(row + 1), EN_LOCALE);
        editor.enter(load, row, 1, `=A${at}*2`, EN_LOCALE);
        editor.enter(load, row, 2, row === 0 ? '=B1' : `=C${String(row)}+B${at}`, EN_LOCALE);
      }
      return load;
    },
  };
};

export type FormulaBook = ReturnType<typeof createFormulaBook>;
