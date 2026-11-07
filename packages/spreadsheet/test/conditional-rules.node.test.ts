import { describe, expect, it } from 'vite-plus/test';
import {
  CONDITIONAL_PRESETS,
  moveRule,
  putRule,
  removeRule,
  rulesOf,
  touches,
  type ConditionalEntry,
  type ConditionalFormat,
  type ConditionalRule,
} from '../src/core';

const blanks: ConditionalRule = { kind: 'blanks', style: { font: { bold: true } } };

const errors: ConditionalRule = { kind: 'errors', style: { font: { italic: true } } };

const repeats: ConditionalRule = { kind: 'duplicates', style: { font: { strike: true } } };

const area = (top: number, left: number, bottom = top, right = left) => ({
  top,
  left,
  bottom,
  right,
});

const entry = (rule: ConditionalRule, priority: number): ConditionalEntry => ({
  rule,
  priority,
  stopIfTrue: false,
});

const shared = [area(0, 0, 9, 0)];

const formats = (): ConditionalFormat[] => [
  { ranges: shared, rules: [entry(blanks, 3), entry(errors, 1)], extension: true },
  { ranges: [area(0, 1, 9, 1)], rules: [entry(repeats, 2)] },
];

const kinds = (list: readonly ConditionalFormat[]): string[] =>
  rulesOf(list).map((placed) => `${String(placed.entry.priority)}:${placed.entry.rule.kind}`);

describe('conditional rule list', () => {
  it('lists the rules of a sheet by priority with the ranges of their format', () => {
    const rules = rulesOf(formats());

    expect(kinds(formats())).toEqual(['1:errors', '2:duplicates', '3:blanks']);
    expect(rules[0]?.ranges).toBe(shared);
  });

  it('moves a rule to another place and numbers the priorities again', () => {
    const moved = moveRule(formats(), 2, 0);

    expect(kinds(moved)).toEqual(['1:blanks', '2:errors', '3:duplicates']);
    expect(moved.find((format) => format.ranges === shared)?.extension).toBe(true);
    expect(kinds(moveRule(formats(), 5, 0))).toEqual(kinds(formats()));
  });

  it('removes a rule and drops a format left without rules', () => {
    const list = formats();
    const duplicates = rulesOf(list)[1]?.entry;

    const removed = duplicates === undefined ? list : removeRule(list, duplicates);

    expect(kinds(removed)).toEqual(['1:errors', '2:blanks']);
    expect(removed).toHaveLength(1);
  });

  it('puts a new rule on top and replaces a rule in its own place', () => {
    const list = formats();
    const added = putRule(list, { ranges: [area(4, 4)], rule: repeats, stopIfTrue: true });

    expect(kinds(added)).toEqual(['1:duplicates', '2:errors', '3:duplicates', '4:blanks']);
    expect(rulesOf(added)[0]?.entry.stopIfTrue).toBe(true);

    const errorsEntry = rulesOf(list)[0]?.entry;

    const replaced = putRule(
      list,
      { ranges: shared, rule: blanks, stopIfTrue: false },
      errorsEntry,
    );

    expect(kinds(replaced)).toEqual(['1:blanks', '2:duplicates', '3:blanks']);
    expect(rulesOf(replaced)[0]?.ranges).toBe(shared);

    const narrowed = putRule(
      list,
      { ranges: [area(0, 0, 4, 0)], rule: errors, stopIfTrue: false },
      errorsEntry,
    );

    expect(rulesOf(narrowed)[0]?.ranges).toEqual([area(0, 0, 4, 0)]);
    expect(narrowed).toHaveLength(3);
  });

  it('tells whether rule ranges meet a selection', () => {
    expect(touches(shared, [area(5, 0)])).toBe(true);
    expect(touches(shared, [area(5, 1), area(10, 0)])).toBe(false);
  });

  it('offers the six Excel presets', () => {
    expect(CONDITIONAL_PRESETS.map((preset) => preset.key)).toEqual([
      'redText',
      'yellowText',
      'greenText',
      'redFill',
      'redFont',
      'redBorder',
    ]);
  });
});
