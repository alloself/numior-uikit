import { describe, expect, it } from 'vite-plus/test';
import { EN_FORMULAS, parseFormula, type ConditionalRule, type PlacedRule } from '../src/core';
import { EN_LOCALE, RU_LOCALE } from '../src/core/locale';
import { formOf, parseArea, ruleOf, withKind } from '../src/sheet/rules/rule-form';
import type { RuleForm } from '../src/sheet/rules/rules.types';

const area = (top: number, left: number, bottom = top, right = left) => ({
  top,
  left,
  bottom,
  right,
});

const placed = (rule: ConditionalRule, ranges = [area(1, 1, 9, 1)]): PlacedRule => ({
  ranges,
  entry: { rule, priority: 1, stopIfTrue: true },
});

const ruleFrom = (form: RuleForm, locale = EN_LOCALE): ConditionalRule | undefined => {
  const result = ruleOf(form, locale);

  return result.ok ? result.draft.rule : undefined;
};

const num = (value: number) => ({ kind: 'number', value }) as const;

const theme = (slot: number) => ({ kind: 'theme', theme: slot, tint: 0 }) as const;

const RED_TEXT = {
  fill: { pattern: 'solid', background: { kind: 'rgb', argb: 'FFFFC7CE' } },
  font: { color: { kind: 'rgb', argb: 'FF9C0006' } },
} as const;

const ROUND_TRIPS: readonly ConditionalRule[] = [
  { kind: 'cellIs', operator: 'between', formulas: [num(1), num(5)], style: RED_TEXT },
  { kind: 'text', operator: 'beginsWith', text: 'ok', style: RED_TEXT },
  { kind: 'timePeriod', period: 'yesterday', style: RED_TEXT },
  { kind: 'top', rank: 15, percent: true, bottom: true, style: RED_TEXT },
  { kind: 'aboveAverage', below: true, equal: true, deviations: 2, style: RED_TEXT },
  { kind: 'duplicates', style: RED_TEXT },
  {
    kind: 'colorScale',
    stops: [
      { threshold: { kind: 'number', value: num(0) }, color: theme(4) },
      { threshold: { kind: 'percentile', value: num(40) }, color: theme(5) },
      { threshold: { kind: 'number', value: num(100) }, color: theme(6) },
    ],
  },
  {
    kind: 'dataBar',
    min: { kind: 'number', value: num(0) },
    max: { kind: 'percent', value: num(90) },
    color: theme(5),
    showValue: false,
  },
  {
    kind: 'iconSet',
    set: '3Arrows',
    thresholds: [
      { kind: 'min' },
      { kind: 'number', value: num(10) },
      { kind: 'number', value: num(20) },
    ],
    reverse: true,
    showValue: true,
  },
];

describe('conditional rule form', () => {
  it.each(ROUND_TRIPS)('reads a $kind rule into the form and writes the same rule', (rule) => {
    expect(ruleFrom(formOf(placed(rule), [], EN_LOCALE))).toEqual(rule);
  });

  it('keeps imported thresholds only while the kind and the icon set stay the same', () => {
    const icons = ROUND_TRIPS.find((rule) => rule.kind === 'iconSet');
    const form = formOf(icons === undefined ? undefined : placed(icons), [], EN_LOCALE);

    expect(ruleFrom({ ...form, iconSet: '4Arrows' })).toMatchObject({
      thresholds: [
        { kind: 'min' },
        { kind: 'percent', value: num(25) },
        { kind: 'percent', value: num(50) },
        { kind: 'percent', value: num(75) },
      ],
      reverse: false,
    });

    expect(ruleFrom(withKind(form, 'dataBar'))).toMatchObject({
      min: { kind: 'min' },
      max: { kind: 'max' },
    });
  });

  it('reads ranges written with commas, semicolons, dollars and reversed corners', () => {
    expect(parseArea('b2:b10, $D$1')).toEqual([area(1, 1, 9, 1), area(0, 3)]);
    expect(parseArea('C5:A1;E2')).toEqual([area(0, 0, 4, 2), area(1, 4)]);
    expect(parseArea('B2:')).toBeUndefined();
    expect(parseArea('  ')).toBeUndefined();
  });

  it('starts a new rule on the selection with the first preset', () => {
    const form = formOf(undefined, [area(1, 1, 9, 1)], EN_LOCALE);

    expect(form.area).toBe('B2:B10');
    expect(form.preset).toBe('redText');

    const rule = ruleFrom({ ...form, first: '100' });

    expect(rule).toMatchObject({ kind: 'cellIs', operator: 'greaterThan', style: RED_TEXT });
  });

  it('reads a rule back into the form and writes the same rule again', () => {
    const parsed = parseFormula('$B2>AVERAGE($B$2:$B$10)', EN_FORMULAS, { row: 1, col: 1 });
    const formula = parsed.ok ? parsed.ast : { kind: 'number' as const, value: 0 };
    const rule: ConditionalRule = { kind: 'expression', formula, style: RED_TEXT };

    const form = formOf(placed(rule), [], EN_LOCALE);

    expect(form.formula).toBe('=$B2>AVERAGE($B$2:$B$10)');
    expect(form.preset).toBe('redText');
    expect(form.stopIfTrue).toBe(true);
    expect(ruleFrom(form)).toEqual(rule);
    expect(formOf(placed(rule), [], RU_LOCALE).formula).toBe('=$B2>СРЗНАЧ($B$2:$B$10)');
  });

  it('keeps unknown parts of a custom style and changes only the edited fields', () => {
    const rule: ConditionalRule = {
      kind: 'duplicates',
      style: { font: { underline: 'single', bold: true }, format: '0.0' },
    };

    const form = formOf(placed(rule), [], EN_LOCALE);

    expect(form.preset).toBe('custom');
    expect(form.custom.bold).toBe(true);

    const edited = ruleFrom({ ...form, custom: { ...form.custom, italic: true } });

    expect(edited).toEqual({
      kind: 'duplicates',
      style: {
        font: { underline: 'single', bold: true, italic: true, strike: false, color: undefined },
        format: '0.0',
        fill: undefined,
      },
    });
  });

  it('names the field that keeps the rule from being written', () => {
    const form = formOf(undefined, [area(0, 0)], EN_LOCALE);

    expect(ruleOf({ ...form, area: 'nope' }, EN_LOCALE)).toEqual({ ok: false, field: 'area' });
    expect(ruleOf(form, EN_LOCALE)).toEqual({ ok: false, field: 'first' });

    expect(ruleOf({ ...form, operator: 'between', first: '1' }, EN_LOCALE)).toEqual({
      ok: false,
      field: 'second',
    });

    expect(ruleOf({ ...form, kind: 'top', rank: '0' }, EN_LOCALE)).toEqual({
      ok: false,
      field: 'rank',
    });

    expect(ruleOf({ ...form, kind: 'expression', formula: '=SUM(' }, EN_LOCALE)).toEqual({
      ok: false,
      field: 'formula',
    });

    expect(ruleOf({ ...form, kind: 'text' }, EN_LOCALE)).toEqual({ ok: false, field: 'text' });
  });

  it('builds scales, bars and icon sets with even thresholds', () => {
    const form = formOf(undefined, [area(0, 0, 9, 0)], EN_LOCALE);

    expect(ruleFrom(withKind(form, 'threeColorScale'))).toMatchObject({
      kind: 'colorScale',
      stops: [
        { threshold: { kind: 'min' } },
        { threshold: { kind: 'percentile', value: { kind: 'number', value: 50 } } },
        { threshold: { kind: 'max' } },
      ],
    });

    expect(ruleFrom({ ...withKind(form, 'iconSet'), iconSet: '4Arrows' })).toMatchObject({
      kind: 'iconSet',
      set: '4Arrows',
      thresholds: [
        { kind: 'min' },
        { kind: 'percent', value: { kind: 'number', value: 25 } },
        { kind: 'percent', value: { kind: 'number', value: 50 } },
        { kind: 'percent', value: { kind: 'number', value: 75 } },
      ],
    });

    expect(ruleFrom(withKind(form, 'dataBar'))).toMatchObject({
      kind: 'dataBar',
      color: { kind: 'rgb', argb: 'FF638EC6' },
    });
  });
});
