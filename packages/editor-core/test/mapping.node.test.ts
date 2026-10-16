import { describe, expect, it } from 'vite-plus/test';
import { createMapping, createStepMap } from '../src';

const insertion = createStepMap([{ start: 4, oldSize: 0, newSize: 3 }]);
const deletion = createStepMap([{ start: 2, oldSize: 4, newSize: 0 }]);
const replacement = createStepMap([{ start: 2, oldSize: 2, newSize: 5 }]);

describe('step maps', () => {
  it('moves positions after a change and keeps the ones before it', () => {
    expect([0, 3, 4, 5, 9].map((pos) => insertion.map(pos))).toEqual([0, 3, 7, 8, 12]);
    expect(insertion.map(4, -1)).toBe(4);
    expect([0, 2, 4, 6, 8].map((pos) => deletion.map(pos))).toEqual([0, 2, 2, 2, 4]);
    expect([2, 3, 4, 5].map((pos) => replacement.map(pos))).toEqual([2, 7, 7, 8]);
    expect(replacement.map(3, -1)).toBe(2);
  });

  it('tells which side of a position was deleted', () => {
    expect(deletion.mapResult(2)).toMatchObject({
      pos: 2,
      deleted: true,
      deletedBefore: false,
      deletedAfter: true,
    });

    expect(deletion.mapResult(4, -1)).toMatchObject({ deleted: true, deletedAcross: true });

    expect(deletion.mapResult(6, -1)).toMatchObject({
      deletedBefore: true,
      deletedAfter: false,
      deletedAcross: false,
    });

    expect(deletion.mapResult(7)).toMatchObject({ pos: 3, deleted: false, deletedBefore: false });
    expect(insertion.mapResult(4)).toMatchObject({ pos: 7, deleted: false, deletedAcross: false });
  });

  it('inverts maps and keeps the surviving positions round trip', () => {
    const inverted = replacement.invert();

    expect(inverted.ranges).toEqual([{ start: 2, oldSize: 5, newSize: 2 }]);
    expect([0, 1, 5, 9].map((pos) => inverted.map(replacement.map(pos)))).toEqual([0, 1, 5, 9]);
    expect(createStepMap([{ start: 3, oldSize: 0, newSize: 0 }]).ranges).toEqual([]);

    const twice = createStepMap([
      { start: 1, oldSize: 1, newSize: 3 },
      { start: 6, oldSize: 2, newSize: 0 },
    ]);

    expect(twice.invert().ranges).toEqual([
      { start: 1, oldSize: 3, newSize: 1 },
      { start: 8, oldSize: 0, newSize: 2 },
    ]);
  });
});

describe('mappings', () => {
  it('compose step maps in order, slice and invert them', () => {
    const mapping = createMapping([insertion, deletion]);

    expect(mapping.map(9)).toBe(8);
    expect(mapping.map(1)).toBe(1);
    expect(mapping.mapResult(3)).toMatchObject({ pos: 2, deleted: true, deletedAcross: true });
    expect(mapping.slice(1).map(9)).toBe(deletion.map(9));
    expect(mapping.concat(createMapping([replacement])).maps).toHaveLength(3);
    expect(mapping.append(replacement).maps.at(-1)).toBe(replacement);
    expect(mapping.invert().map(mapping.map(10))).toBe(10);
    expect(createMapping().map(5)).toBe(5);
  });
});
