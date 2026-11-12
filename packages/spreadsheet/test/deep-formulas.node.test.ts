import { describe, expect, it } from 'vite-plus/test';
import {
  FormulaFailureReason,
  createCellEditor,
  createStepCodec,
  createWorkbook,
  parseFormula,
  printFormula,
  type FormulaNode,
  type WorkbookStep,
} from '../src/core';
import { readWorkbook, writeWorkbook, type Bytes, type XlsxRead } from '../src/xlsx';
import { openBook } from './book-harness';
import { SALES_SHEET, xlsxPackage } from './xlsx-package';

type Opened = Extract<XlsxRead, { readonly kind: 'editable' | 'read-only' }>;

const LADDER = [
  ['^', '1'],
  ['*', '-1%'],
  ['+', '-1%'],
  ['&', '""'],
] as const;

const chain = (term: string, count: number): string =>
  `=${Array.from({ length: count }, () => term).join('+')}`;

const groups = (count: number): string => `=${'1-('.repeat(count)}1-1${')'.repeat(count)}`;

const calls = (count: number): string => `=${'ABS('.repeat(count)}1${')'.repeat(count)}`;

const signs = (count: number): string => `=${'-'.repeat(count)}1`;

const percents = (count: number): string => `=1${'%'.repeat(count)}`;

const ladder = (count: number): string => {
  const opened = Array.from({ length: count }, (_, level) => {
    const [op, operand] = LADDER[Math.floor((level * LADDER.length) / count)] ?? ['+', '1'];

    return `${operand}${op}(`;
  });

  return `=${opened.join('')}1&1${')'.repeat(count)}`;
};

const ACCEPTED: readonly (readonly [string, string])[] = [
  ['a chain of 2048 operands', chain('1', 2048)],
  ['256 nested brackets', groups(256)],
  ['65 nested functions', calls(65)],
  ['1024 signs in a row', signs(1024)],
  ['2047 percent signs in a row', percents(2047)],
  ['256 brackets over every operator level', ladder(256)],
];

const REFUSED: readonly (readonly [string, string, FormulaFailureReason])[] = [
  ['257 nested brackets', groups(257), FormulaFailureReason.Nesting],
  ['66 nested functions', calls(66), FormulaFailureReason.Nesting],
  ['1025 signs in a row', signs(1025), FormulaFailureReason.Nesting],
  ['a chain of 2049 operands', chain('1', 2049), FormulaFailureReason.Depth],
  ['2048 percent signs in a row', percents(2048), FormulaFailureReason.Depth],
];

const astOf = (text: string): FormulaNode => {
  const parsed = parseFormula(text);

  if (!parsed.ok) {
    throw new Error(`${text.slice(0, 40)}… breaks with ${parsed.error.reason}`);
  }
  return parsed.ast;
};

const signed = (depth: number): FormulaNode =>
  Array.from({ length: depth }).reduce<FormulaNode>(
    (operand) => ({ kind: 'unary', op: '-', operand }),
    { kind: 'number', value: 1 },
  );

const subtracted = (depth: number): FormulaNode =>
  Array.from({ length: depth }).reduce<FormulaNode>(
    (right) => ({ kind: 'binary', op: '-', left: { kind: 'number', value: 1 }, right }),
    { kind: 'number', value: 1 },
  );

const formulaStep = (ast: FormulaNode): WorkbookStep => ({
  kind: 'setCells',
  sheet: 'Sheet1',
  cells: [{ row: 0, col: 1, content: { kind: 'formula', ast } }],
});

const overWire = (step: WorkbookStep): WorkbookStep | undefined => {
  const codec = createStepCodec(createWorkbook());
  const wire: unknown = JSON.parse(JSON.stringify(codec.encode(step)));

  return codec.decode(wire);
};

const opened = async (bytes: Bytes): Promise<Opened> => {
  const read = await readWorkbook(bytes);

  if (read.kind === 'rejected') {
    throw new Error(`the package was rejected: ${read.reason}`);
  }
  return read;
};

const roundTrip = async (book: ReturnType<typeof openBook>): Promise<string> => {
  const written = await writeWorkbook(book.book, book.calculator);

  if (!written.ok) {
    throw new Error(`the book was refused: ${JSON.stringify(written.report.losses)}`);
  }

  const read = await opened(written.bytes);
  const sheet = read.book.sheet('Sheet1');

  if (sheet === undefined) {
    throw new Error('Sheet1 is missing');
  }
  return createCellEditor(read.book, read.calculator).inputText(sheet, 0, 1);
};

describe('formulas at the nesting limits of Excel', () => {
  it.each(ACCEPTED)('reads and prints %s', (_what, text) => {
    const ast = astOf(text);

    expect(`=${printFormula(ast)}`).toBe(text);
  });

  it.each(REFUSED)('refuses %s', (_what, text, reason) => {
    const parsed = parseFormula(text);

    expect(parsed).toMatchObject({ ok: false, error: { reason } });
  });

  it.each(ACCEPTED)('carries %s over the wire', (_what, text) => {
    const step = formulaStep(astOf(text));

    expect(overWire(step)).toEqual(step);
  });

  it('turns away a formula deeper than 2048 levels on the wire', () => {
    expect(overWire(formulaStep(signed(2048)))).toBeUndefined();
    expect(overWire(formulaStep(signed(2047)))).toBeDefined();
  });

  it('computes a chain of 2048 references, follows an inserted row and keeps it in a file', async () => {
    const book = openBook();

    book.type('A1', '1');
    book.type('B1', chain('A1', 2048));

    expect(book.shown('B1')).toBe('2048');

    book.insert('1');

    expect(book.input('B2')).toBe(chain('A2', 2048));
    expect(book.shown('B2')).toBe('2048');

    book.remove('1');

    expect(await roundTrip(book)).toBe(chain('A1', 2048));
  });

  it.each([
    ['nested functions', calls(65), '1'],
    ['signs in a row', signs(1024), '1'],
    ['nested brackets', groups(256), '0'],
    ['a ladder of operators', ladder(256), '1'],
  ])('computes %s at the limit and keeps them in a file', async (_what, text, value) => {
    const book = openBook();

    book.type('B1', text);

    expect(book.shown('B1')).toBe(value);
    expect(await roundTrip(book)).toBe(text);
  });

  it('computes an array formula with an operator chain of 2048 levels', () => {
    const book = openBook();

    book.type('A1', '2');
    book.type('A2', '3');
    book.type('B1', `=SUM(A1:A2${'*1'.repeat(2045)})`);

    expect(book.shown('B1')).toBe('5');
  });

  it('asks before it writes as a value a formula whose brackets Excel would not take', async () => {
    const book = openBook();

    book.commit(formulaStep(subtracted(300)));

    const written = await writeWorkbook(book.book, book.calculator);

    expect(written).toMatchObject({
      ok: false,
      report: { losses: [{ sheet: 'Sheet1', reason: 'refused-formula' }] },
    });
  });

  it('keeps a formula from a file deeper than it reads with the value saved in the file', async () => {
    const deep = `${'('.repeat(300)}B2*Rate${')'.repeat(300)}`;
    const long = `${'1+'.repeat(2100)}B3*Rate`;

    const read = await opened(
      await xlsxPackage({
        'xl/worksheets/sheet1.xml': SALES_SHEET.replace('B2*Rate', deep).replace('B3*Rate', long),
      }),
    );

    const sales = read.book.sheet('Sales');
    const editor = createCellEditor(read.book, read.calculator);

    if (sales === undefined) {
      throw new Error('Sales is missing');
    }

    read.calculator.recalculate({ imported: true, budgetMs: Number.POSITIVE_INFINITY });

    expect(read.kind).toBe('editable');

    expect(read.report.items.find((item) => item.code === 'formula-kept')).toMatchObject({
      count: 2,
    });

    expect(editor.inputText(sales, 1, 2)).toBe(`=${deep}`);
    expect(editor.inputText(sales, 2, 2)).toBe(`=${long}`);
    expect(editor.shown(sales, 1, 2).text).toBe('75.0%');
  });
});
