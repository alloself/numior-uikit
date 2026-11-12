import { describe, expect, it } from 'vite-plus/test';
import {
  BASE_FUNCTIONS,
  EN_FORMULAS,
  FormulaFailureReason,
  RU_FORMULAS,
  createFunctionRegistry,
  parseFormula,
  type FormulaLocale,
} from '../src/core';
import { excelInputCases } from './excel-input';

const FUNCTIONS = createFunctionRegistry(BASE_FUNCTIONS);

const TOP_LEFT = { row: 0, col: 0 };

const typed = (formula: string, locale: FormulaLocale = EN_FORMULAS) =>
  parseFormula(formula, locale, TOP_LEFT, { signatures: (name) => FUNCTIONS.get(name) });

const taken = (formula: string): boolean => typed(formula).ok;

const failureOf = (formula: string, locale?: FormulaLocale) => {
  const parse = typed(formula, locale);

  return parse.ok ? undefined : parse.error;
};

const WORDS = 31;

const ONLY_IN_EXCEL: Readonly<Record<string, string>> = {
  '=SUMIF(A1:A2 A1,1)': 'the parser reads no intersection',
  '=SUMIF(A1:A2 B1:B2,1)': 'the parser reads no intersection',
  '=SUMIF((A1,A2),1)': 'the parser reads no union',
  '=INDEX((A1:A2,B1:B2),1,1,2)': 'the parser reads no union',
  '=SUMIF(A1:INDEX(A1:A2,2),1)': 'the parser reads no range ending in a call',
  '=SUMIF(INDEX(A1:A2,1):A2,1)': 'the parser reads no range starting with a call',
  '=SUMIF(A1:A2:B3,1)': 'the parser reads no range of ranges',
  '=SUMIF(LAMBDA(x,x)(A1:A2),1)': 'the parser reads no call of a LAMBDA',
};

const ONLY_HERE: Readonly<Record<string, string>> = {
  '=CELL("row",)': 'CELL is not a function of the sheet',
  '=RANK.AVG(1,{1,2})': 'RANK.AVG is not a function of the sheet',
  '=ISFORMULA(1)': 'ISFORMULA is not a function of the sheet',
};

const quoted = (length: number) => `="${'a'.repeat(length)}"`;

const tiny = (zeros: number) => `=0.${'0'.repeat(zeros)}1`;

const joined = (length: number): string => {
  const word = `"${'a'.repeat(255)}"`;
  const head = `=${Array.from({ length: WORDS }, () => word).join('&')}&"`;

  return `${head}${'a'.repeat(length - head.length - 1)}"`;
};

describe('formulas Excel takes on input', () => {
  it('takes and refuses every formula the way Excel 16 did when it was typed there', () => {
    const cases = excelInputCases();

    const differing = cases.reduce<Record<string, string>>((found, entry) => {
      if (taken(entry.formula) === entry.taken) {
        return found;
      }

      const known = entry.taken ? ONLY_IN_EXCEL : ONLY_HERE;

      found[entry.formula] =
        known[entry.formula] ?? `${entry.taken ? 'taken' : 'refused'} by Excel`;

      return found;
    }, {});

    expect(cases.length).toBeGreaterThan(14_000);
    expect(differing).toEqual({ ...ONLY_IN_EXCEL, ...ONLY_HERE });
  });

  it('holds a formula to 8192 characters and a text in it to 255', () => {
    expect(taken(joined(8192))).toBe(true);

    expect(failureOf(joined(8193))).toEqual({
      position: 8193,
      reason: FormulaFailureReason.LongFormula,
    });

    expect(taken(quoted(255))).toBe(true);
    expect(taken(`=CHOOSE(1,{"${'a'.repeat(255)}"})`)).toBe(true);

    expect(failureOf(quoted(256))).toMatchObject({
      position: 1,
      reason: FormulaFailureReason.LongText,
    });

    expect(failureOf(`=CHOOSE(1,{"${'a'.repeat(256)}"})`)).toMatchObject({ position: 11 });
  });

  it('takes numbers from 1E-309 to under 1E+308 in size and a zero with an exponent up to 308', () => {
    expect(taken(tiny(308))).toBe(true);
    expect(failureOf(tiny(309))).toMatchObject({ reason: FormulaFailureReason.SmallNumber });
    expect(taken(`=1${'0'.repeat(307)}`)).toBe(true);

    expect(failureOf(`=1${'0'.repeat(308)}`)).toMatchObject({
      reason: FormulaFailureReason.BigNumber,
    });

    expect(failureOf('=-1E+308')).toEqual({ position: 2, reason: FormulaFailureReason.BigNumber });

    expect(failureOf('={1,-9E-310}')).toEqual({
      position: 4,
      reason: FormulaFailureReason.SmallNumber,
    });

    expect(taken('=0E+308')).toBe(true);
    expect(failureOf('=0E-309')).toMatchObject({ reason: FormulaFailureReason.SmallNumber });
  });

  it('points at the argument and names the function that refuses it', () => {
    expect(failureOf('=1+SUMIF({1,2},1)')).toEqual({
      position: 9,
      reason: FormulaFailureReason.ReferenceArgument,
      name: 'SUMIF',
      argument: 1,
    });

    expect(failureOf('=SUMIFS(A1:A2,B1:B2,1,{1,2},2)')).toMatchObject({
      position: 22,
      name: 'SUMIFS',
      argument: 4,
    });

    expect(failureOf('=ABS(ROUND(1))')).toEqual({
      position: 5,
      reason: FormulaFailureReason.Arguments,
      name: 'ROUND',
    });

    expect(failureOf('=СУММЕСЛИ({1;2};1)', RU_FORMULAS)).toEqual({
      position: 10,
      reason: FormulaFailureReason.ReferenceArgument,
      name: 'SUMIF',
      argument: 1,
    });
  });

  it('reads any formula when nobody types it', () => {
    expect(parseFormula('=SUBTOTAL(9,{1,2})').ok).toBe(true);
    expect(parseFormula('=ROUND(1)').ok).toBe(true);
    expect(parseFormula('=1E-400').ok).toBe(true);
  });
});
