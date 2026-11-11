import { describe, expect, it } from 'vite-plus/test';
import { rulesOf, type ConditionalFormat } from '../src/core';
import { patchFormats } from '../src/core/conditional/patch';

const rule = (top: number, priority = 1, stopIfTrue = false): ConditionalFormat => ({
  ranges: [{ top, left: 0, bottom: top, right: 0 }],
  rules: [{ rule: { kind: 'blanks', style: {} }, priority, stopIfTrue }],
});

const numbered = (...tops: readonly number[]): ConditionalFormat[] =>
  tops.map((top, index) => rule(top, index + 1));

const rowsOf = (formats: readonly ConditionalFormat[]): readonly number[] =>
  rulesOf(formats).map((placed) => placed.ranges[0]?.top ?? -1);

const prioritiesOf = (formats: readonly ConditionalFormat[]): readonly number[] =>
  rulesOf(formats).map((placed) => placed.entry.priority);

describe('patching conditional formats', () => {
  it('gives the own list back as it was when nobody has changed the rules since', () => {
    const mine = [rule(1), rule(2)];

    const patched = patchFormats([rule(2), rule(3)], mine, [rule(2), rule(3)]);

    expect(patched).toBe(mine);
  });

  it('takes away what it added, returns what it removed and keeps the rules added since', () => {
    const patched = patchFormats(numbered(1, 3), numbered(1, 2), numbered(3, 1, 9));

    expect(rowsOf(patched)).toEqual([1, 2, 9]);
  });

  it('counts equal rules one by one', () => {
    const patched = patchFormats(numbered(1, 1), numbered(1), numbered(1, 1, 4));

    expect(rowsOf(patched)).toEqual([1, 4]);
  });

  it('leaves a rule someone else has rewritten when it removes the rule as it was', () => {
    const patched = patchFormats(numbered(1, 3), numbered(1), [rule(1), rule(3, 2, true)]);

    expect(patched).toEqual([rule(1), rule(3, 2, true)]);
  });

  it('keeps every rule once when two people add a rule and number all the rules again', () => {
    const patched = patchFormats(numbered(1, 2), numbered(9, 1, 2), numbered(8, 1, 2));

    expect(rowsOf(patched)).toEqual([9, 8, 1, 2]);
    expect(prioritiesOf(patched)).toEqual([1, 2, 3, 4]);
  });

  it('keeps the order someone else gave the rules when it only adds a rule', () => {
    const patched = patchFormats(numbered(1, 2), numbered(9, 1, 2), numbered(2, 1));

    expect(rowsOf(patched)).toEqual([9, 2, 1]);
  });

  it('gives its own order to the rules it moved and keeps a rule added since after its neighbour', () => {
    const patched = patchFormats(numbered(1, 2), numbered(2, 1), numbered(1, 8, 2));

    expect(rowsOf(patched)).toEqual([2, 1, 8]);
  });

  it('takes its own rule back from under a rule someone else has added since', () => {
    const patched = patchFormats(numbered(9, 1, 2), numbered(1, 2), numbered(8, 9, 1, 2));

    expect(rowsOf(patched)).toEqual([8, 1, 2]);
  });

  it('keeps the rules of one range in one format', () => {
    const shared: ConditionalFormat = {
      ranges: [{ top: 1, left: 0, bottom: 1, right: 0 }],
      rules: [
        { rule: { kind: 'blanks', style: {} }, priority: 1, stopIfTrue: false },
        { rule: { kind: 'blanks', style: {} }, priority: 2, stopIfTrue: true },
      ],
    };

    const patched = patchFormats([shared], [shared, rule(5, 3)], [shared, rule(7, 3)]);

    expect(patched).toHaveLength(3);
    expect(patched[0]?.rules).toHaveLength(2);
  });
});
