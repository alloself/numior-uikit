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

const GROUP = ' ';

const range = (address: string): CellRange => {
  const found = parseRange(address);

  if (found === undefined) {
    throw new Error(`${address} is not a range`);
  }
  return found;
};

const AUTUMN_2026 = new Date(2026, 9, 21, 9);

const openEditor = (today = AUTUMN_2026, locale = RU_LOCALE) => {
  const book = createWorkbook();
  const sheet = book.addSheet();

  const calculator = createCalculator(book, {
    locale,
    clock: () => today,
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
    value: (row: number, col: number) => sheet.cells.get(row, col),
    result: (row: number, col: number) => {
      calculator.recalculate({ budgetMs: Number.POSITIVE_INFINITY });
      return sheet.cells.get(row, col);
    },
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

    expect(readInput('#н/д', RU_NUMBERS)).toEqual({
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
    expect(sheet.shown(2, 0)).toBe(`1${GROUP}234${GROUP}567,89`);
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

    expect(sheet.shown(0, 0)).toBe(`1${GROUP}234,50`);
    expect(sheet.shown(2, 0)).toBe(`1${GROUP}234,50`);
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

  it('reads a date typed without a year in the year of the clock, as Excel does', () => {
    const sheet = openEditor();

    const typed = ['15.03', '15/03', '15-03', '15. 03', '1.1', '15 мар', '15мар', '1 Январь'];

    typed.forEach((text, row) => {
      sheet.enter(row, 0, text);
    });

    expect(typed.map((_text, row) => sheet.value(row, 0))).toEqual(
      [46096, 46096, 46096, 46096, 46023, 46096, 46096, 46023].map(numberValue),
    );

    expect(typed.map((_text, row) => sheet.format(row, 0))).toEqual(typed.map(() => 'dd.mmm'));
    expect(sheet.shown(0, 0)).toBe('15.мар');
    expect(sheet.input(0, 0)).toBe('15.03.2026');

    sheet.enter(10, 0, '15.03 10:30');

    expect([sheet.value(10, 0), sheet.format(10, 0)]).toEqual([
      numberValue(46096.4375),
      'dd.mm.yyyy h:mm',
    ]);
  });

  it('keeps as text a date without a year that the year of the clock does not have', () => {
    const sheet = openEditor();
    const kept = ['15 марта', '15.03.', '29.02', '31.02', '15.13', '15 Mar'];

    kept.forEach((text, row) => {
      sheet.enter(row, 0, text);
    });

    expect(kept.map((_text, row) => sheet.value(row, 0))).toEqual(kept.map(textValue));

    const leap = openEditor(new Date(2028, 0, 10));

    leap.enter(0, 0, '29.02');

    expect(leap.value(0, 0)).toEqual(numberValue(46812));
  });

  it('reads a date without a year in the order of an English book', () => {
    const sheet = openEditor(AUTUMN_2026, EN_LOCALE);
    const typed = ['3/15', '3-15', '15-Mar', '15 Mar', 'Mar 15'];

    typed.forEach((text, row) => {
      sheet.enter(row, 0, text);
    });

    expect(typed.map((_text, row) => sheet.value(row, 0))).toEqual(
      typed.map(() => numberValue(46096)),
    );

    expect(typed.map((_text, row) => sheet.format(row, 0))).toEqual(typed.map(() => 'd-mmm'));

    sheet.enter(6, 0, '15/3');

    expect(sheet.value(6, 0)).toEqual(textValue('15/3'));
  });

  it('reads a date without a year in a formula and marks such text when it is edited', () => {
    const sheet = openEditor();

    sheet.enter(0, 0, '=ДАТАЗНАЧ("15.03")');
    sheet.enter(1, 0, '="15.03"+0');
    sheet.enter(2, 0, '="15 мар"*1');
    sheet.enter(3, 0, '=ДАТАЗНАЧ("29.02")');
    sheet.enter(4, 0, "'15.03");

    expect([0, 1, 2, 3].map((row) => sheet.shown(row, 0))).toEqual([
      '15.03.2026',
      '46096',
      '46096',
      '#ЗНАЧ!',
    ]);

    expect(sheet.input(4, 0)).toBe("'15.03");

    expect(readInput('15.03', RU_NUMBERS)).toEqual({
      kind: 'value',
      value: textValue('15.03'),
      format: undefined,
    });
  });

  it('reads a month with a year typed without a day as the first of that month, as Excel does', () => {
    const sheet = openEditor();

    const typed: readonly (readonly [string, number])[] = [
      ['03.15', 42064],
      ['3.15', 42064],
      ['3/15', 42064],
      ['3-15', 42064],
      ['03 . 15', 42064],
      ['12.2026', 46357],
      ['3/2026', 46082],
      ['3 .2026', 46082],
      ['12.99', 36495],
      ['12.30', 11293],
      ['2.29', 47150],
      ['1.13', 41275],
      ['02.1900', 32],
      ['мар 15', 42064],
      ['мар.15', 42064],
      ['мар-15', 42064],
      ['мар/15', 42064],
      ['Март 15', 42064],
      ['мар 2026', 46082],
      ['мар 99', 36220],
      ['мар 5', 38412],
      ['мар 0', 36586],
    ];

    typed.forEach(([text], row) => {
      sheet.enter(row, 0, text);
    });

    expect(typed.map((_entry, row) => sheet.value(row, 0))).toEqual(
      typed.map(([, serial]) => numberValue(serial)),
    );

    expect(typed.map((_entry, row) => sheet.format(row, 0))).toEqual(typed.map(() => 'mmm.yy'));
    expect(sheet.shown(0, 0)).toBe('мар.15');
    expect(sheet.input(0, 0)).toBe('01.03.2015');
  });

  it('reads two numbers as a day and a month first and keeps what is neither as text', () => {
    const sheet = openEditor();
    const days = ['1.2', '3.05', '12.9', '12.12'];

    const kept = [
      '13.15',
      '13.2026',
      '0.15',
      '00.2026',
      '12.1899',
      '12.10000',
      '15-2026',
      '3.0',
      '3.00',
      '3/0',
      '31.11',
      '29.02',
      'марта 2026',
      'мар 100',
      'мар 2026г',
      'мар,15',
      'мар 15 2026',
    ];

    [...days, ...kept].forEach((text, row) => {
      sheet.enter(row, 0, text);
    });

    expect(days.map((_text, row) => [sheet.value(row, 0), sheet.format(row, 0)])).toEqual(
      [46054, 46145, 46277, 46368].map((serial) => [numberValue(serial), 'dd.mmm']),
    );

    expect(kept.map((_text, row) => sheet.value(days.length + row, 0))).toEqual(
      kept.map(textValue),
    );
  });

  it('keeps a date, a time or a logical value typed after a space as text and reads a number either way', () => {
    const sheet = openEditor();

    const kept = [
      ' 15.03',
      ' 15.03.2026',
      ' 03.15',
      ' мар 15',
      ' 10:30',
      ' ИСТИНА',
      'ИСТИНА ',
      ' #Н/Д',
      '#Н/Д ',
    ];

    const read: readonly (readonly [string, number, string])[] = [
      ['15.03 ', 46096, 'dd.mmm'],
      ['15.03.2026 ', 46096, 'dd.mm.yyyy'],
      ['03.15 ', 42064, 'mmm.yy'],
      ['10:30 ', 0.4375, 'h:mm'],
      [' 5', 5, 'General'],
      ['  5  ', 5, 'General'],
      [' 5%', 0.05, '0%'],
      [' 1,5', 1.5, 'General'],
      ['- 5', -5, 'General'],
      [' 5 000 ', 5000, '#,##0'],
    ];

    kept.forEach((text, row) => {
      sheet.enter(row, 0, text);
    });

    read.forEach(([text], row) => {
      sheet.enter(kept.length + row, 0, text);
    });

    expect(kept.map((_text, row) => sheet.value(row, 0))).toEqual(kept.map(textValue));

    expect(
      read.map((_entry, row) => [
        sheet.value(kept.length + row, 0),
        sheet.format(kept.length + row, 0),
      ]),
    ).toEqual(read.map(([, value, format]) => [numberValue(value), format]));
  });

  it('gives a date typed with a time the short date and time format whatever the date looked like', () => {
    const sheet = openEditor();

    const typed: readonly (readonly [string, number])[] = [
      ['03.2026 10:30', 46082.4375],
      ['мар 15 10:30', 42064.4375],
      ['15 мар 2026 10:30', 46096.4375],
      ['март 2026 10:30', 46082.4375],
      ['1 мар 15 10:30', 42064.4375],
    ];

    typed.forEach(([text], row) => {
      sheet.enter(row, 0, text);
    });

    expect(typed.map((_entry, row) => [sheet.value(row, 0), sheet.format(row, 0)])).toEqual(
      typed.map(([, serial]) => [numberValue(serial), 'dd.mm.yyyy h:mm']),
    );
  });

  it('reads a month with a year in formulas and trims spaces only in DATEVALUE, TIMEVALUE and VALUE', () => {
    const sheet = openEditor();

    const formulas = [
      '=ДАТАЗНАЧ("03.15")',
      '=ДАТАЗНАЧ("12.2026")',
      '=ДАТАЗНАЧ("мар 15")',
      '="03.15"+0',
      '=ДАТАЗНАЧ(" 15.03.2026 ")',
      '=ВРЕМЗНАЧ(" 10:30 ")',
      '=ЗНАЧЕН(" 12.2026 ")',
      '="10:30 "+0',
      '=" 5 "+0',
      '=" 15.03.2026 "+0',
      '=" 10:30"+0',
      '=ГОД(" 15.03.2026")',
      '=ГОД("15.03.2026 ")',
      '=ГОД("03.15")',
      '=МЕСЯЦ("12.2026")',
    ];

    formulas.forEach((text, row) => {
      sheet.enter(row, 0, text);
    });

    expect(formulas.map((_text, row) => sheet.result(row, 0))).toEqual([
      numberValue(42064),
      numberValue(46357),
      numberValue(42064),
      numberValue(42064),
      numberValue(46096),
      numberValue(0.4375),
      numberValue(46357),
      numberValue(0.4375),
      numberValue(5),
      errorValue('#VALUE!'),
      errorValue('#VALUE!'),
      errorValue('#VALUE!'),
      numberValue(2026),
      numberValue(2015),
      numberValue(12),
    ]);
  });

  it('reads a month with a year in an English book only where the second number cannot be a day', () => {
    const sheet = openEditor(AUTUMN_2026, EN_LOCALE);

    const typed: readonly (readonly [string, number, string])[] = [
      ['3/45', 16497, 'mmm-yy'],
      ['12/2026', 46357, 'mmm-yy'],
      ['Mar 45', 16497, 'mmm-yy'],
      ['Mar 2026', 46082, 'mmm-yy'],
      ['Mar-15', 46096, 'd-mmm'],
      ['Mar 15', 46096, 'd-mmm'],
    ];

    typed.forEach(([text], row) => {
      sheet.enter(row, 0, text);
    });

    sheet.enter(6, 0, '13/2026');
    sheet.enter(7, 0, '3/00');

    expect(typed.map((_entry, row) => [sheet.value(row, 0), sheet.format(row, 0)])).toEqual(
      typed.map(([, serial, format]) => [numberValue(serial), format]),
    );

    expect([sheet.value(6, 0), sheet.value(7, 0)]).toEqual([
      textValue('13/2026'),
      textValue('3/00'),
    ]);
  });

  it('reports a formula that does not parse and leaves the cell as it was', () => {
    const sheet = openEditor();

    sheet.enter(0, 0, '5');

    expect(sheet.enter(0, 0, '=1+')).toMatchObject({ position: 3 });
    expect(sheet.shown(0, 0)).toBe('5');
  });
});
