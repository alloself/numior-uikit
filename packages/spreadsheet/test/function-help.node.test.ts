import { describe, expect, it } from 'vite-plus/test';
import {
  BASE_FUNCTIONS,
  HelpLanguage,
  RU_FORMULAS,
  functionCallAt,
  functionPrefixAt,
  loadFunctionHelp,
  signatureOf,
  type FunctionHelp,
  type FunctionHelpCatalog,
  type SignaturePart,
} from '../src/core';

const VARIADIC = 255;

const shown = (parts: readonly SignaturePart[]): string =>
  parts.map((part) => (part.current ? `<${part.text}>` : part.text)).join('');

const fits = (help: FunctionHelp | undefined, min: number, max: number): boolean =>
  help !== undefined &&
  help.summary.length > 0 &&
  help.args.length >= min &&
  (help.args.length === max || (max === VARIADIC && help.args.length < max));

const misfits = (catalog: FunctionHelpCatalog): string[] =>
  BASE_FUNCTIONS.flatMap((spec) =>
    fits(catalog[spec.name], spec.min, spec.max) ? [] : [spec.name],
  );

describe('function help', () => {
  it('describes every registered function in English and Russian with its arguments', async () => {
    const en = await loadFunctionHelp(HelpLanguage.En);
    const ru = await loadFunctionHelp(HelpLanguage.Ru);

    expect(misfits(en)).toEqual([]);
    expect(misfits(ru)).toEqual([]);

    expect(
      BASE_FUNCTIONS.filter((spec) => en[spec.name]?.args.length !== ru[spec.name]?.args.length),
    ).toEqual([]);

    expect(Object.keys(en).length).toBe(BASE_FUNCTIONS.length);
    expect(Object.keys(ru).length).toBe(BASE_FUNCTIONS.length);
  });

  it('builds a signature with optional arguments, the repeated tail and the current argument', async () => {
    const en = await loadFunctionHelp(HelpLanguage.En);
    const sum = { name: 'SUM', min: 1, max: VARIADIC, separator: ',' };
    const sumifs = { name: 'SUMIFS', min: 3, max: VARIADIC, separator: ';' };

    expect(
      shown(signatureOf({ ...sum, help: { summary: 'x', args: ['a', 'b'] }, argument: 0 })),
    ).toBe('SUM(<a>, [b], …)');

    expect(
      shown(signatureOf({ ...sum, help: { summary: 'x', args: ['a', 'b'] }, argument: 7 })),
    ).toBe('SUM(a, <[b]>, …)');

    const help = en.SUMIFS;

    expect(help).toBeDefined();

    expect(help === undefined ? '' : shown(signatureOf({ ...sumifs, help, argument: 6 }))).toBe(
      'SUMIFS(sum_range; criteria_range1; criteria1; [criteria_range2]; <[criteria2]>; …)',
    );

    expect(
      shown(
        signatureOf({
          name: 'IF',
          min: 2,
          max: 3,
          separator: ',',
          help: { summary: 'x', args: ['t', 'y', 'n'] },
          argument: 3,
        }),
      ),
    ).toBe('IF(t, y, [n])');
  });

  it('finds the function name being typed in an operand position', () => {
    expect(functionPrefixAt('=SU', 3)).toEqual({ start: 1, text: 'SU' });
    expect(functionPrefixAt('=A1+su', 6)).toEqual({ start: 4, text: 'su' });
    expect(functionPrefixAt('=СУММ(сч', 8, RU_FORMULAS)).toEqual({ start: 6, text: 'сч' });
    expect(functionPrefixAt('=SUM(A1)SU', 10)).toBeUndefined();
    expect(functionPrefixAt('=SU', 2)).toBeUndefined();
    expect(functionPrefixAt('="SU', 4)).toBeUndefined();
    expect(functionPrefixAt('SU', 2)).toBeUndefined();
    expect(functionPrefixAt('=Sheet1!A', 9)).toBeUndefined();
  });

  it('finds the innermost call around the caret and the argument it is in', () => {
    expect(functionCallAt('=SUM(', 5)).toEqual({ name: 'SUM', argument: 0 });
    expect(functionCallAt('=SUM(A1,B2', 10)).toEqual({ name: 'SUM', argument: 1 });
    expect(functionCallAt('=IF(A1>0,ROUND(A1,', 18)).toEqual({ name: 'ROUND', argument: 1 });
    expect(functionCallAt('=IF(A1>0,ROUND(A1,2),', 21)).toEqual({ name: 'IF', argument: 2 });
    expect(functionCallAt('=SUM({1,2,3},', 13)).toEqual({ name: 'SUM', argument: 1 });
    expect(functionCallAt('=ЕСЛИ(A1;1;', 11, RU_FORMULAS)).toEqual({ name: 'ЕСЛИ', argument: 2 });
    expect(functionCallAt('=SUM(A1)', 8)).toBeUndefined();
    expect(functionCallAt('=SUM("a,', 8)).toBeUndefined();
  });
});
