import * as fc from 'fast-check';
import { describe, expect, it } from 'vite-plus/test';
import {
  CELL_ERRORS,
  EN_FORMULAS,
  RU_FORMULAS,
  formulaReferences,
  parseFormula,
  printFormula,
  type BinaryOperator,
  type FormulaLocale,
  type FormulaNode,
} from '../src/core';

const astOf = (text: string, locale: FormulaLocale = EN_FORMULAS): FormulaNode => {
  const parsed = parseFormula(text, locale);

  if (!parsed.ok) {
    throw new Error(`${text} breaks at ${String(parsed.error.position)}`);
  }
  return parsed.ast;
};

const failureOf = (text: string, locale: FormulaLocale = EN_FORMULAS): unknown => {
  const parsed = parseFormula(text, locale);

  return parsed.ok ? undefined : parsed.error;
};

const num = (value: number): FormulaNode => ({ kind: 'number', value });

const cell = (row: number, col: number, sheet?: string): FormulaNode => ({
  kind: 'cell',
  sheet,
  ref: { row, col, rowAbsolute: false, colAbsolute: false },
});

const binary = (op: BinaryOperator, left: FormulaNode, right: FormulaNode): FormulaNode => ({
  kind: 'binary',
  op,
  left,
  right,
});

const OPERATORS: readonly BinaryOperator[] = [
  '+',
  '-',
  '*',
  '/',
  '^',
  '&',
  '=',
  '<>',
  '<',
  '>',
  '<=',
  '>=',
];

const plainNumber = fc.oneof(
  fc.nat(),
  fc.double({ min: 0, max: 1e12, noNaN: true }).filter((value) => !Object.is(value, -0)),
  fc.constantFrom(1e21, 1.5e-7),
);

const ref = fc.record({
  row: fc.integer({ min: 0, max: 1_048_575 }),
  col: fc.integer({ min: 0, max: 16_383 }),
  rowAbsolute: fc.boolean(),
  colAbsolute: fc.boolean(),
});

const line = (max: number) =>
  fc.record({ index: fc.integer({ min: 0, max }), absolute: fc.boolean() });

const sheet = fc.option(fc.constantFrom('Sheet1', 'Отчёт', 'My Sheet', "Bob's", '2024', 'A1'), {
  nil: undefined,
});

const constant = fc.oneof(
  plainNumber.map((value): FormulaNode => ({ kind: 'number', value })),
  fc.string().map((value): FormulaNode => ({ kind: 'string', value })),
  fc.boolean().map((value): FormulaNode => ({ kind: 'boolean', value })),
  fc.constantFrom(...CELL_ERRORS).map((code): FormulaNode => ({ kind: 'error', code })),
);

const arrayItem = fc.oneof(
  constant,
  fc
    .integer({ min: 1, max: 1000 })
    .map((value): FormulaNode => ({ kind: 'number', value: -value })),
);

const array = fc
  .tuple(fc.integer({ min: 1, max: 3 }), fc.integer({ min: 1, max: 3 }))
  .chain(([rows, cols]) =>
    fc.array(fc.array(arrayItem, { minLength: cols, maxLength: cols }), {
      minLength: rows,
      maxLength: rows,
    }),
  )
  .map((rows): FormulaNode => ({ kind: 'array', rows }));

const reference = fc.oneof(
  fc.record({ sheet, ref }).map(({ sheet: name, ref: at }): FormulaNode => ({
    kind: 'cell',
    sheet: name,
    ref: at,
  })),
  fc
    .record({ sheet, from: ref, to: ref })
    .map(({ sheet: name, from, to }): FormulaNode => ({ kind: 'range', sheet: name, from, to })),
  fc
    .record({ sheet, from: line(16_383), to: line(16_383) })
    .map(({ sheet: name, from, to }): FormulaNode => ({ kind: 'columns', sheet: name, from, to })),
  fc
    .record({ sheet, from: line(1_048_575), to: line(1_048_575) })
    .map(({ sheet: name, from, to }): FormulaNode => ({ kind: 'rows', sheet: name, from, to })),
  fc.record({ sheet, ref }).map(({ sheet: name, ref: at }): FormulaNode => ({
    kind: 'spill',
    sheet: name,
    ref: at,
  })),
  fc
    .constantFrom('Total', 'tax_rate', 'Итого', 'my.range')
    .map((name): FormulaNode => ({ kind: 'name', name })),
);

const callArguments = (expression: fc.Arbitrary<FormulaNode>) =>
  fc.oneof(
    fc.array(expression, { maxLength: 3 }),
    fc.array(fc.oneof(expression, fc.constant<FormulaNode>({ kind: 'missing' })), {
      minLength: 2,
      maxLength: 4,
    }),
  );

const { formula } = fc.letrec<{ formula: FormulaNode }>((tie) => ({
  formula: fc.oneof(
    { depthSize: 'small', withCrossShrink: true },
    constant,
    reference,
    array,
    fc
      .record({
        name: fc.constantFrom('SUM', 'IF', 'T.TEST', 'VLOOKUP', 'LOG10'),
        args: callArguments(tie('formula')),
      })
      .map(({ name, args }): FormulaNode => ({ kind: 'call', name, args })),
    fc
      .record({ op: fc.constantFrom<'-' | '+'>('-', '+'), operand: tie('formula') })
      .map(({ op, operand }): FormulaNode => ({ kind: 'unary', op, operand })),
    tie('formula').map((operand): FormulaNode => ({ kind: 'percent', operand })),
    fc
      .record({ op: fc.constantFrom(...OPERATORS), left: tie('formula'), right: tie('formula') })
      .map(({ op, left, right }) => binary(op, left, right)),
  ),
}));

describe('formula parser', () => {
  it('reads constants, references and calls with or without the leading equals sign', () => {
    expect(astOf('=42')).toEqual(num(42));
    expect(astOf('1.5E+3')).toEqual(num(1500));
    expect(astOf('"say ""hi"""')).toEqual({ kind: 'string', value: 'say "hi"' });
    expect(astOf('=true')).toEqual({ kind: 'boolean', value: true });
    expect(astOf('=#n/a')).toEqual({ kind: 'error', code: '#N/A' });

    expect(astOf('=sum(A1, 2)')).toEqual({
      kind: 'call',
      name: 'SUM',
      args: [cell(0, 0), num(2)],
    });

    expect(astOf('=Total')).toEqual({ kind: 'name', name: 'Total' });
  });

  it('follows the Excel operator precedence', () => {
    expect(astOf('=-2^2')).toEqual(
      binary('^', { kind: 'unary', op: '-', operand: num(2) }, num(2)),
    );

    expect(astOf('=2^3^2')).toEqual(binary('^', binary('^', num(2), num(3)), num(2)));
    expect(astOf('=1+2*3')).toEqual(binary('+', num(1), binary('*', num(2), num(3))));
    expect(astOf('=1&2+3')).toEqual(binary('&', num(1), binary('+', num(2), num(3))));
    expect(astOf('=1<2&3')).toEqual(binary('<', num(1), binary('&', num(2), num(3))));
    expect(astOf('=50%*2')).toEqual(binary('*', { kind: 'percent', operand: num(50) }, num(2)));
    expect(astOf('=(1+2)*3')).toEqual(binary('*', binary('+', num(1), num(2)), num(3)));
  });

  it('reads ranges, whole columns and rows, sheets and spilled ranges', () => {
    expect(astOf('=$A$1:B2')).toEqual({
      kind: 'range',
      sheet: undefined,
      from: { row: 0, col: 0, rowAbsolute: true, colAbsolute: true },
      to: { row: 1, col: 1, rowAbsolute: false, colAbsolute: false },
    });

    expect(astOf('=A:$C')).toEqual({
      kind: 'columns',
      sheet: undefined,
      from: { index: 0, absolute: false },
      to: { index: 2, absolute: true },
    });

    expect(astOf('=2:$4')).toEqual({
      kind: 'rows',
      sheet: undefined,
      from: { index: 1, absolute: false },
      to: { index: 3, absolute: true },
    });

    expect(astOf("='My ''Q1'' data'!B3")).toEqual(cell(2, 1, "My 'Q1' data"));

    expect(astOf('=Отчёт!A1#')).toEqual({
      kind: 'spill',
      sheet: 'Отчёт',
      ref: { row: 0, col: 0, rowAbsolute: false, colAbsolute: false },
    });
  });

  it('reads a range that names its sheet at both ends', () => {
    expect(astOf("='Q1 data'!A12:'q1 DATA'!$B$12")).toEqual(astOf("='Q1 data'!A12:$B$12"));
    expect(astOf('=[1]Other!A:[1]Other!B')).toEqual(astOf('=[1]Other!A:B'));
    expect(failureOf('=Other!A1:Sheet1!B2')).toEqual({ position: 10, reason: 'reference' });
    expect(failureOf('=A1:Sheet1!B2')).toEqual({ position: 4, reason: 'reference' });
  });

  it('keeps missing arguments and reads array constants', () => {
    expect(astOf('=IF(A1,,)')).toEqual({
      kind: 'call',
      name: 'IF',
      args: [cell(0, 0), { kind: 'missing' }, { kind: 'missing' }],
    });

    expect(astOf('=NOW()')).toEqual({ kind: 'call', name: 'NOW', args: [] });

    expect(astOf('={1,-2;"a",TRUE}')).toEqual({
      kind: 'array',
      rows: [
        [num(1), num(-2)],
        [
          { kind: 'string', value: 'a' },
          { kind: 'boolean', value: true },
        ],
      ],
    });
  });

  it('reads the Russian separators', () => {
    expect(astOf('=СУММ(1,5;A1)', RU_FORMULAS)).toEqual({
      kind: 'call',
      name: 'SUM',
      args: [num(1.5), cell(0, 0)],
    });

    expect(astOf('={1\\2;3\\4}', RU_FORMULAS)).toEqual({
      kind: 'array',
      rows: [
        [num(1), num(2)],
        [num(3), num(4)],
      ],
    });
  });

  it('reads Russian and English function names, logical words and errors', () => {
    expect(astOf('=ЕСЛИ(ИСТИНА;#Н/Д;ложь)', RU_FORMULAS)).toEqual({
      kind: 'call',
      name: 'IF',
      args: [
        { kind: 'boolean', value: true },
        { kind: 'error', code: '#N/A' },
        { kind: 'boolean', value: false },
      ],
    });

    expect(astOf('=счет(#ДЕЛ/0!;TRUE)', RU_FORMULAS)).toEqual({
      kind: 'call',
      name: 'COUNT',
      args: [
        { kind: 'error', code: '#DIV/0!' },
        { kind: 'boolean', value: true },
      ],
    });

    expect(astOf('=СЧЁТЗ(A1)', RU_FORMULAS)).toEqual(astOf('=COUNTA(A1)'));
    expect(astOf('=ВПР(1;A1:B2;2;0)', RU_FORMULAS)).toEqual(astOf('=VLOOKUP(1,A1:B2,2,0)'));
  });

  it('reads references into other books by their link number', () => {
    expect(astOf('=[1]Other!$A$1')).toEqual({
      kind: 'cell',
      book: 1,
      sheet: 'Other',
      ref: { row: 0, col: 0, rowAbsolute: true, colAbsolute: true },
    });

    expect(astOf("='[2]Q1 data'!A1:B2")).toMatchObject({
      kind: 'range',
      book: 2,
      sheet: 'Q1 data',
    });

    expect(astOf('=[1]!Rate')).toEqual({ kind: 'name', book: 1, name: 'Rate' });

    expect(astOf("='[1]Q1 data'!Base")).toEqual({
      kind: 'name',
      book: 1,
      sheet: 'Q1 data',
      name: 'Base',
    });

    expect(astOf('=СУММ([1]Лист1!A1:A3)', RU_FORMULAS)).toMatchObject({ name: 'SUM' });
    expect(failureOf('=[1]Other')).toEqual({ position: 4, reason: 'token' });
  });

  it('reads the implicit intersection operator and its file form', () => {
    expect(astOf('=@A1:A3*2')).toEqual(astOf('=SINGLE(A1:A3)*2'));
    expect(astOf('=@A1:A3')).toMatchObject({ kind: 'unary', op: '@', operand: { kind: 'range' } });
    expect(printFormula(astOf('=-@A1:A3+SINGLE(B1:B2)'))).toBe('-@A1:A3+@B1:B2');
  });

  it('points at the place where a formula breaks', () => {
    expect(failureOf('=1+')).toEqual({ position: 3, reason: 'end' });
    expect(failureOf('=1+)')).toEqual({ position: 3, reason: 'token' });
    expect(failureOf('="open')).toEqual({ position: 1, reason: 'token' });
    expect(failureOf('=SUM(1,2')).toEqual({ position: 8, reason: 'end' });
    expect(failureOf('={1,2;3}')).toEqual({ position: 7, reason: 'array' });
    expect(failureOf('={A1}')).toEqual({ position: 2, reason: 'array' });
    expect(failureOf('=A1:7')).toEqual({ position: 4, reason: 'reference' });
    expect(failureOf('=1 2')).toEqual({ position: 3, reason: 'token' });
    expect(failureOf('=1?')).toEqual({ position: 2, reason: 'token' });
  });
});

describe('formula printer', () => {
  it('prints the fewest parentheses that keep the tree', () => {
    expect(printFormula(astOf('=(1+2)*3'))).toBe('(1+2)*3');
    expect(printFormula(astOf('=1+(2*3)'))).toBe('1+2*3');
    expect(printFormula(astOf('=1-(2-3)'))).toBe('1-(2-3)');
    expect(printFormula(astOf('=2^(3^2)'))).toBe('2^(3^2)');
    expect(printFormula(astOf('=-(A1%)'))).toBe('-(A1%)');
    expect(printFormula(astOf("='Q1 data'!A1:B2"))).toBe("'Q1 data'!A1:B2");
  });

  it('prints with the separators of the locale', () => {
    expect(printFormula(astOf('=SUM(1.5,{1,2;3,4})'), RU_FORMULAS)).toBe('СУММ(1,5;{1\\2;3\\4})');

    expect(printFormula(astOf("=[1]Other!$A$1+'[2]Q1 data'!B2+[1]!Rate"))).toBe(
      "[1]Other!$A$1+'[2]Q1 data'!B2+[1]!Rate",
    );

    expect(printFormula(astOf('=IF(TRUE,#N/A,COUNT(#REF!))'), RU_FORMULAS)).toBe(
      'ЕСЛИ(ИСТИНА;#Н/Д;СЧЁТ(#ССЫЛКА!))',
    );
  });

  it('reads back every printed tree in both locales', () => {
    fc.assert(
      fc.property(formula, fc.constantFrom(EN_FORMULAS, RU_FORMULAS), (ast, locale) => {
        expect(astOf(printFormula(ast, locale), locale)).toEqual(ast);
      }),
      { numRuns: 500 },
    );
  });
});

describe('formula references', () => {
  it('collects the references and names a formula reads in order', () => {
    expect(
      formulaReferences(astOf('=SUM(A1:B2, Sheet1!C3) * -Total + {1,2} & D:D')).map((found) =>
        printFormula(found),
      ),
    ).toEqual(['A1:B2', 'Sheet1!C3', 'Total', 'D:D']);
  });
});

describe('references relative to the formula cell', () => {
  it('stores relative parts as offsets so a formula reads the same from any cell', () => {
    const here = { row: 4, col: 2 };
    const parsed = parseFormula('=A1+$B$2+B$7+$C3+A:A+3:3+A1#', EN_FORMULAS, here);

    if (!parsed.ok) {
      throw new Error('the formula does not parse');
    }

    expect(printFormula(parsed.ast, EN_FORMULAS, here)).toBe('A1+$B$2+B$7+$C3+A:A+3:3+A1#');

    expect(printFormula(parsed.ast, EN_FORMULAS, { row: 5, col: 3 })).toBe(
      'B2+$B$2+C$7+$C4+B:B+4:4+B2#',
    );

    expect(printFormula(parsed.ast, EN_FORMULAS, { row: 0, col: 0 })).toBe(
      '#REF!+$B$2+#REF!+#REF!+#REF!+#REF!+#REF!',
    );
  });
});
