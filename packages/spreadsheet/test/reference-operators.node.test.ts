import { describe, expect, it } from 'vite-plus/test';
import {
  RU_FORMULAS,
  createCellEditor,
  createStepCodec,
  createWorkbook,
  parseFormula,
  printFormula,
  type WorkbookStep,
} from '../src/core';
import { AREA_ERRORS, AREA_READERS } from '../src/core/calc/areas';
import { readWorkbook, writeWorkbook } from '../src/xlsx';
import { openBook } from './book-harness';

type Book = ReturnType<typeof openBook>;

const COLUMNS = ['A', 'B', 'C'];

const filled = (): Book => {
  const book = openBook();

  for (let row = 1; row <= 5; row += 1) {
    for (const [index, column] of COLUMNS.entries()) {
      book.type(`${column}${String(row)}`, String(row * 10 + index + 1));
      book.type(`${column}${String(row)}`, String(100 + row * 10 + index + 1), 'Rates');
    }
  }

  book.name('Rate', '=Sheet1!$B$2');
  return book;
};

const shownFor = (book: Book, text: string): string => {
  book.type('H1', text);
  return book.shown('H1');
};

const astOf = (text: string) => {
  const parsed = parseFormula(text);

  if (!parsed.ok) {
    throw new Error(`${text} breaks with ${parsed.error.reason}`);
  }
  return parsed.ast;
};

describe('reference operators measured in Excel 16', () => {
  it.each([
    ['a range that ends in a call', '=SUM(A1:INDEX(A1:A5,3))', '63'],
    ['a range that ends in OFFSET', '=SUM(A1:OFFSET(A1,2,0))', '63'],
    ['a range of ranges', '=SUM(A1:A2:B3)', '129'],
    ['the rows of a range of ranges', '=ROWS(A1:A2:B3)', '3'],
    ['the columns of a range of ranges', '=COLUMNS(A1:A2:B3)', '2'],
    ['a range from a bracketed range', '=SUM((A1:A2):B3)', '129'],
    ['a range to a bracketed cell', '=SUM(A1:(B2))', '66'],
    ['a range to a union', '=SUM(A1:(B2,C3))', '198'],
    ['a range to a whole column', '=SUM(A1:INDEX(A:A,0))', '155'],
    ['a whole column joined with a cell', '=SUM(A:A:B1)', '315'],
    ['a range from a name', '=SUM(Rate:B5)', '148'],
    ['a range under a minus', '=SUM(-A1:A2)', '-32'],
    ['an intersection', '=A1:A3 A2:B2', '21'],
    ['an intersection of a column and a row', '=A:A 2:2', '21'],
    ['an intersection with a union', '=A1:B2 (B2,C3)', '22'],
    ['a union cut by an intersection', '=SUM((A1,B1) A1:C1)', '23'],
    ['ranges that do not meet', '=A1:A2 C1:C2', '#NULL!'],
    ['the areas of an intersection', '=AREAS(A1:B2 B2:C3)', '1'],
    ['an empty intersection as a reference', '=ISREF(A1 B1)', 'FALSE'],
    ['an empty intersection caught', '=IFERROR(A1 B1,7)', '7'],
    ['a union in a cell', '=(A1,B1)', '#VALUE!'],
    ['a sum of a union', '=SUM((A1,B1))', '23'],
    ['a count of a cell twice', '=COUNT((A1,A1))', '2'],
    ['the second area of a union', '=INDEX((A1:A2,B1:B2),1,1,2)', '12'],
    ['an area past the union', '=INDEX((A1:A2,B1:B2),1,1,3)', '#REF!'],
    ['the areas of a union', '=AREAS((A1,B1:C2))', '2'],
    ['a union as a reference', '=ISREF((A1,B1))', 'TRUE'],
    ['a union passed on by IF', '=SUM(IF(TRUE,(A1,B1)))', '23'],
    ['a union given back by IF', '=IF(TRUE,(A1,B1))', '#VALUE!'],
    ['the rows of a union', '=ROWS((A1,B1))', '#REF!'],
    ['a match in a union', '=MATCH(11,(A1,B1),0)', '#N/A'],
    ['a function that takes no union', '=GCD((A1,B1))', '#VALUE!'],
    ['a union under ISERROR', '=ISERROR((A1,B1))', 'TRUE'],
    ['the type of a union', '=TYPE((A1,B1))', '16'],
    ['a range across sheets', '=SUM(Rates!A1:B2:C3)', '#VALUE!'],
    ['a union across sheets', '=SUM((A1,Rates!A1))', '#VALUE!'],
    ['an intersection across sheets', '=A1 Rates!A1', '#VALUE!'],
    ['a range from a lost reference', '=SUM(#REF!:A2)', '#REF!'],
    ['a name met by a bracket after a space', '=SUM (A1)', '#NAME?'],
    ['a call of a reference', '=INDEX(A1:A2,1)(2)', '#REF!'],
    ['a call of a LAMBDA Excel 16 does not know', '=LAMBDA(x,x)(A1)', '#NAME?'],
  ])('computes %s', (_what, text, value) => {
    const book = filled();

    expect(shownFor(book, text)).toBe(value);
  });

  it.each([
    ['a text at the end of a range', '=A1:"B2"'],
    ['a number at the end of a range', '=A1:1'],
    ['a sign at the end of a range', '=A1:-A2'],
    ['a call that gives no reference at the end of a range', '=A1:SUM(B1)'],
    ['two numbers apart', '=1 2'],
    ['a cell and a number apart', '=A1 1'],
    ['a text and a cell apart', '="a" A1'],
    ['a call of a sum', '=SUM(1)(2)'],
    ['a call of ABS', '=ABS(1)(2)'],
    ['a call of a bracket', '=(1)(2)'],
    ['a union of numbers', '=(1,2)'],
    ['a union with a number', '=(1,A1)'],
    ['a range into a sheet range', '=Sheet1:Rates!A1'],
  ])('refuses %s the way Excel does', (_what, text) => {
    const book = filled();

    expect(() => {
      book.type('H1', text);
    }).toThrow('does not parse');
  });
});

describe('reference operators in a formula', () => {
  it.each([
    '=A1:A2:B3',
    '=A1:(B2:C3)',
    '=SUM(A1:A3 A2:B2)',
    '=SUM((A1,B1),C1)',
    '=SUM((A1,B1:C2,Rate))',
    '=INDEX(A1:A2,1)(2)',
    '=-A1 B1',
    '=Rate (A1:B2,C3)',
    '=A1 (B1 C1)',
  ])('prints %s back as it was read', (text) => {
    expect(`=${printFormula(astOf(text))}`).toBe(text);
  });

  it('names only functions the sheet knows among those that read or refuse areas', () => {
    const book = openBook();
    const named = [...AREA_READERS, ...AREA_ERRORS.keys()];

    expect(named.filter((name) => book.calculator.functions.get(name) === undefined)).toEqual([]);
  });

  it('writes a union with the separator of the Russian locale', () => {
    const ast = astOf('=SUM((A1,B1))');

    expect(printFormula(ast, RU_FORMULAS)).toBe('СУММ((A1;B1))');
    expect(parseFormula('=СУММ((A1;B1))', RU_FORMULAS)).toEqual({ ok: true, ast });
  });

  it('recalculates a range of ranges when a cell inside the box changes', () => {
    const book = filled();

    book.type('H1', '=SUM(A1:A2:B3)');
    book.type('B1', '1000');

    expect(book.shown('H1')).toBe('1117');

    book.type('A3', '0');

    expect(book.shown('H1')).toBe('1086');
  });

  it.each([
    ['=B2:B4 B3:C3', '32'],
    ['=SUM(B2:C4 B1:B2)', '22'],
    ['=COUNT(B3:C3 B1:B5)', '1'],
    ['=SUM((A1:C5 C1:C5) B2:C2)', '23'],
    ['=SUM(OFFSET(A1,0,0,5,3) A2:B2)', '43'],
    ['=@B1:INDEX(B1:B5,2)', '#VALUE!'],
  ])('reads %s inside its own operands without a circular reference', (text, value) => {
    const book = filled();

    book.type('C3', text);
    book.shown('C3');
    book.calculator.setLocale(book.calculator.locale);

    expect(book.shown('C3')).toBe(value);
  });

  it('recalculates an intersection and a union when a cell they give changes', () => {
    const book = filled();

    book.type('H1', '=A1:A3 A2:B2');
    book.type('H2', '=SUM((A1,B1))');
    book.type('H3', '=@A1:A5 A2:B4');

    expect(['H1', 'H2', 'H3'].map((address) => book.shown(address))).toEqual(['21', '23', '31']);

    book.type('A2', '5');
    book.type('B1', '7');
    book.type('A3', '9');

    expect(['H1', 'H2', 'H3'].map((address) => book.shown(address))).toEqual(['5', '18', '9']);
  });

  it('recalculates a range whose end is found by an intersection inside a call', () => {
    const book = filled();

    book.type('H1', '=SUM(A1:INDEX(A1:A5,SUM(B1:B5 B2)/22))');

    expect(book.shown('H1')).toBe('11');

    book.type('B2', '44');

    expect(book.shown('H1')).toBe('32');
  });

  it('recalculates a range ending in INDEX when its end moves', () => {
    const book = filled();

    book.type('G1', '2');
    book.type('H1', '=SUM(A1:INDEX(A1:A5,G1))');

    expect(book.shown('H1')).toBe('32');

    book.type('G1', '4');
    book.type('A4', '100');

    expect(book.shown('H1')).toBe('163');
  });

  it('follows inserted rows in every reference of the operators', () => {
    const book = filled();

    book.type('H5', '=SUM(A1:INDEX(A1:A5,3),(B1,C2) B1:C3)');
    book.insert('1');

    expect(book.input('H6')).toBe('=SUM(A2:INDEX(A2:A6,3),(B2,C3) B2:C4)');
    expect(book.shown('H6')).toBe('98');
  });

  it('carries the operators over the wire', () => {
    const step: WorkbookStep = {
      kind: 'setCells',
      sheet: 'Sheet1',
      cells: [
        {
          row: 0,
          col: 7,
          content: { kind: 'formula', ast: astOf('=SUM(A1:A2:B3 B2,(A1,B1),INDEX(A1:A2,1)(2))') },
        },
      ],
    };

    const codec = createStepCodec(createWorkbook());
    const wire: unknown = JSON.parse(JSON.stringify(codec.encode(step)));

    expect(codec.decode(wire)).toEqual(step);
  });

  it('turns away a union of one area on the wire', () => {
    const codec = createStepCodec(createWorkbook());

    const step = {
      kind: 'setCells',
      sheet: 'Sheet1',
      cells: [
        {
          row: 0,
          col: 0,
          content: {
            kind: 'formula',
            ast: { kind: 'union', areas: [{ kind: 'number', value: 1 }] },
          },
        },
      ],
    };

    expect(codec.decode(step)).toBeUndefined();
  });

  it('keeps the operators in a file and computes them after reading it back', async () => {
    const book = filled();

    book.type('H1', '=SUM(A1:A3 A2:B2,(A1,B1),A1:INDEX(A1:A5,2))');

    const written = await writeWorkbook(book.book, book.calculator);

    if (!written.ok) {
      throw new Error('the book was refused');
    }

    const read = await readWorkbook(written.bytes);

    if (read.kind === 'rejected') {
      throw new Error(read.reason);
    }

    const sheet = read.book.sheet('Sheet1');

    if (sheet === undefined) {
      throw new Error('Sheet1 is missing');
    }

    read.calculator.recalculate({ imported: true, budgetMs: Number.POSITIVE_INFINITY });

    const editor = createCellEditor(read.book, read.calculator);

    expect(editor.inputText(sheet, 0, 7)).toBe('=SUM(A1:A3 A2:B2,(A1,B1),A1:INDEX(A1:A5,2))');
    expect(editor.shown(sheet, 0, 7).text).toBe('76');
  });
});
