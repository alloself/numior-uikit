import { describe, expect, it } from 'vite-plus/test';
import {
  EN_LOCALE,
  EN_NUMBERS,
  RU_LOCALE,
  RU_NUMBERS,
  booleanValue,
  createCalculator,
  createCellEditor,
  createWorkbook,
  editText,
  errorValue,
  numberValue,
  parseRange,
  readInput,
  textValue,
  type CellRange,
} from '../src/core';

const NBSP = ' ';

const range = (address: string): CellRange => {
  const found = parseRange(address);

  if (found === undefined) {
    throw new Error(`${address} is not a range`);
  }
  return found;
};

const openEditor = () => {
  const book = createWorkbook();
  const sheet = book.addSheet();

  const calculator = createCalculator(book, {
    locale: RU_LOCALE,
    clock: () => new Date(2026, 9, 21, 9),
  });

  const editor = createCellEditor(book, calculator);

  return {
    book,
    sheet,
    calculator,
    enter: (row: number, col: number, text: string) => editor.enter(sheet, row, col, text),
    shown: (row: number, col: number) => {
      calculator.recalculate({ budgetMs: Number.POSITIVE_INFINITY });
      return editor.shown(sheet, row, col).text;
    },
    input: (row: number, col: number) => editor.inputText(sheet, row, col),
    format: (row: number, col: number) => editor.formatAt(sheet, row, col),
    setFormat: (address: string, code: string) => {
      editor.setFormat(sheet, range(address), code);
    },
  };
};

describe('reading typed input', () => {
  it('turns typed text into values with the format the typing implies', () => {
    expect(readInput('12%', EN_NUMBERS)).toEqual({
      kind: 'value',
      value: numberValue(0.12),
      format: '0%',
    });

    expect(readInput('1 234,5', RU_NUMBERS)).toEqual({
      kind: 'value',
      value: numberValue(1234.5),
      format: '#,##0.00',
    });

    expect(readInput('$1,000', EN_NUMBERS)).toEqual({
      kind: 'value',
      value: numberValue(1000),
      format: '"$"#,##0;("$"#,##0)',
    });

    expect(readInput('01.02.2026', RU_NUMBERS)).toEqual({
      kind: 'value',
      value: numberValue(46054),
      format: 'dd.mm.yyyy',
    });

    expect(readInput('9:30', RU_NUMBERS)).toEqual({
      kind: 'value',
      value: numberValue(9.5 / 24),
      format: 'h:mm',
    });

    expect(readInput('42', EN_NUMBERS)).toEqual({
      kind: 'value',
      value: numberValue(42),
      format: undefined,
    });
  });

  it('reads the dates of the last month a sheet can hold', () => {
    expect(readInput('12/31/9999', EN_NUMBERS)).toEqual({
      kind: 'value',
      value: numberValue(2_958_465),
      format: 'm/d/yyyy',
    });

    expect(readInput('01.12.9999', RU_NUMBERS)).toEqual({
      kind: 'value',
      value: numberValue(2_958_435),
      format: 'dd.mm.yyyy',
    });

    expect(readInput('12/32/9999', EN_NUMBERS)).toEqual({
      kind: 'value',
      value: textValue('12/32/9999'),
      format: undefined,
    });
  });

  it('keeps a number too large for a cell and a repeated sign as the typed text', () => {
    const texts = ['1e400', '--5', '+-5', '-$-5', '- -5'];

    expect(texts.map((text) => readInput(text, EN_NUMBERS))).toEqual(
      texts.map((text) => ({ kind: 'value', value: textValue(text), format: undefined })),
    );

    expect(
      ['-5', '+5', '-$5', '$-5', '(5)', '1e300'].map((text) => {
        const read = readInput(text, EN_NUMBERS);

        return read.kind === 'value' ? read.value : undefined;
      }),
    ).toEqual([-5, 5, -5, -5, -5, 1e300].map(numberValue));
  });

  it('keeps quoted, logical, formula and empty entries apart', () => {
    expect(readInput("'0123", EN_NUMBERS)).toEqual({
      kind: 'value',
      value: textValue('0123'),
      format: undefined,
    });

    expect(readInput('ИСТИНА', RU_NUMBERS)).toEqual({
      kind: 'value',
      value: booleanValue(true),
      format: undefined,
    });

    expect(readInput(' #н/д ', RU_NUMBERS)).toEqual({
      kind: 'value',
      value: errorValue('#N/A'),
      format: undefined,
    });

    expect(readInput('#DIV/0!', RU_NUMBERS)).toEqual({
      kind: 'value',
      value: errorValue('#DIV/0!'),
      format: undefined,
    });

    expect(readInput('25:30', EN_NUMBERS)).toEqual({
      kind: 'value',
      value: numberValue(25.5 / 24),
      format: '[h]:mm',
    });

    expect(readInput('=A1+1', EN_NUMBERS)).toEqual({ kind: 'formula', text: '=A1+1' });
    expect(readInput('', EN_NUMBERS)).toEqual({ kind: 'empty' });

    expect(readInput('счёт', RU_NUMBERS)).toEqual({
      kind: 'value',
      value: textValue('счёт'),
      format: undefined,
    });
  });

  it('writes values back the way they would be typed again', () => {
    expect(editText(numberValue(0.125), '0.00%', RU_NUMBERS)).toBe('12,5%');
    expect(editText(numberValue(46054.75), 'dd.mm.yyyy', RU_NUMBERS)).toBe('01.02.2026 18:00:00');
    expect(editText(numberValue(0.75), 'h:mm', EN_NUMBERS)).toBe('6:00:00 PM');
    expect(editText(numberValue(1234.5678), '#,##0.00', RU_NUMBERS)).toBe('1234,5678');
    expect(editText(textValue('0123'), 'General', EN_NUMBERS)).toBe("'0123");
    expect(editText(textValue('note'), 'General', EN_NUMBERS)).toBe('note');
    expect(editText(booleanValue(false), 'General', RU_NUMBERS)).toBe('ЛОЖЬ');
    expect(editText(errorValue('#DIV/0!'), 'General', RU_NUMBERS)).toBe('#ДЕЛ/0!');
    expect(editText(errorValue('#DIV/0!'), 'General', EN_NUMBERS)).toBe('#DIV/0!');
  });
});

describe('cell editor', () => {
  it('stores the detected format and shows values through it', () => {
    const sheet = openEditor();

    sheet.enter(0, 0, '15.03.2023');
    sheet.enter(1, 0, '12,5%');
    sheet.enter(2, 0, '1 234 567,891');

    expect(sheet.shown(0, 0)).toBe('15.03.2023');
    expect(sheet.input(0, 0)).toBe('15.03.2023');
    expect(sheet.shown(1, 0)).toBe('12,50%');
    expect(sheet.input(1, 0)).toBe('12,5%');
    expect(sheet.shown(2, 0)).toBe(`1${NBSP}234${NBSP}567,89`);
    expect(sheet.book.formats.size).toBe(4);
  });

  it('gives a formula in a general cell the format its result or first reference implies', () => {
    const sheet = openEditor();

    sheet.enter(0, 0, '15.03.2023');
    sheet.enter(0, 1, '=A1+1');
    sheet.enter(1, 1, '=TODAY()');
    sheet.enter(2, 1, '=PMT(0,1;12;1000)');
    sheet.enter(3, 1, '=IRR({-100;60;60})');
    sheet.setFormat('C1', '0.0');
    sheet.enter(0, 2, '=A1');
    sheet.enter(4, 1, '=COUNTIF(A1:A3;">0")');
    sheet.enter(5, 1, '=A1>0');

    expect(sheet.shown(0, 1)).toBe('16.03.2023');
    expect(sheet.shown(1, 1)).toBe('21.10.2026');
    expect(sheet.shown(2, 1)).toBe('-146,76 ₽');
    expect(sheet.format(3, 1)).toBe('0%');
    expect(sheet.shown(0, 2)).toBe('45000,0');
    expect(sheet.shown(4, 1)).toBe('1');
    expect(sheet.shown(5, 1)).toBe('ИСТИНА');
  });

  it('applies formats to ranges and shows formulas in the current syntax', () => {
    const sheet = openEditor();

    sheet.enter(0, 0, '1234,5');
    sheet.enter(2, 0, '=ROUND(A1;1)');
    sheet.setFormat('A1:A3', '#,##0.00');

    expect(sheet.shown(0, 0)).toBe(`1${NBSP}234,50`);
    expect(sheet.shown(2, 0)).toBe(`1${NBSP}234,50`);
    expect(sheet.input(2, 0)).toBe('=ОКРУГЛ(A1;1)');

    sheet.calculator.setLocale(EN_LOCALE);

    expect(sheet.shown(0, 0)).toBe('1,234.50');
    expect(sheet.input(2, 0)).toBe('=ROUND(A1,1)');
    expect(sheet.input(0, 0)).toBe('1234.5');

    sheet.setFormat('A1:A3', 'General');

    expect(sheet.sheet.formats.size).toBe(0);
  });

  it('shows errors, logical values and functions in the language of the book', () => {
    const sheet = openEditor();

    sheet.enter(0, 0, '=1/0');
    sheet.enter(1, 0, '=ЕСЛИ(ЕОШИБКА(A1);ИСТИНА;ЛОЖЬ)');
    sheet.enter(2, 0, '#Н/Д');

    expect(sheet.shown(0, 0)).toBe('#ДЕЛ/0!');
    expect(sheet.shown(1, 0)).toBe('ИСТИНА');
    expect(sheet.shown(2, 0)).toBe('#Н/Д');
    expect(sheet.input(1, 0)).toBe('=ЕСЛИ(ЕОШИБКА(A1);ИСТИНА;ЛОЖЬ)');

    sheet.calculator.setLocale(EN_LOCALE);

    expect(sheet.shown(0, 0)).toBe('#DIV/0!');
    expect(sheet.shown(1, 0)).toBe('TRUE');
    expect(sheet.shown(2, 0)).toBe('#N/A');
    expect(sheet.input(1, 0)).toBe('=IF(ISERROR(A1),TRUE,FALSE)');
    expect(sheet.input(2, 0)).toBe('#N/A');
  });

  it('keeps entries in a text cell as typed', () => {
    const sheet = openEditor();

    sheet.setFormat('A1', '@');
    sheet.enter(0, 0, '0123');
    sheet.enter(0, 1, '=A1');

    expect(sheet.shown(0, 0)).toBe('0123');
    expect(sheet.input(0, 0)).toBe('0123');
    expect(sheet.shown(0, 1)).toBe('0123');
  });

  it('reports a formula that does not parse and leaves the cell as it was', () => {
    const sheet = openEditor();

    sheet.enter(0, 0, '5');

    expect(sheet.enter(0, 0, '=1+')).toMatchObject({ position: 3 });
    expect(sheet.shown(0, 0)).toBe('5');
  });
});
