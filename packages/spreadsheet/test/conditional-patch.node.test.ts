import { describe, expect, it } from 'vite-plus/test';
import type { ConditionalFormat } from '../src/core';
import { patchFormats } from '../src/core/conditional/patch';

const rule = (top: number, priority = 1): ConditionalFormat => ({
  ranges: [{ top, left: 0, bottom: top, right: 0 }],
  rules: [{ rule: { kind: 'blanks', style: {} }, priority, stopIfTrue: false }],
});

const rowsOf = (formats: readonly ConditionalFormat[]): readonly number[] =>
  formats.map((format) => format.ranges[0]?.top ?? -1);

describe('patching conditional formats', () => {
  it('gives the own list back as it was when nobody has changed the rules since', () => {
    const mine = [rule(1), rule(2)];

    const patched = patchFormats([rule(2), rule(3)], mine, [rule(2), rule(3)]);

    expect(patched).toBe(mine);
  });

  it('takes away what it added, returns what it removed and keeps the rules added since', () => {
    const patched = patchFormats(
      [rule(1), rule(3)],
      [rule(1), rule(2)],
      [rule(3), rule(1), rule(9)],
    );

    expect(rowsOf(patched)).toEqual([1, 9, 2]);
  });

  it('counts equal rules one by one', () => {
    const patched = patchFormats([rule(1), rule(1)], [rule(1)], [rule(1), rule(1), rule(4)]);

    expect(rowsOf(patched)).toEqual([1, 4]);
  });

  it('leaves out a rule someone else has already removed or rewritten', () => {
    const patched = patchFormats([rule(1), rule(3)], [rule(1)], [rule(1), rule(3, 7)]);

    expect(patched).toEqual([rule(1), rule(3, 7)]);
  });
});
