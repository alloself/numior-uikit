import { describe, expect, it } from 'vitest';
import {
  isUnder,
  joinPath,
  matchesPattern,
  normalizePath,
  patternOf,
  toVeePath,
} from '../src/paths/paths';

describe('paths', () => {
  it('accepts bracket indexes from servers and keeps dots as the canonical form', () => {
    expect(normalizePath('items[0].name')).toBe('items.0.name');
    expect(normalizePath('[2].name')).toBe('2.name');
    expect(normalizePath('items.0.name')).toBe('items.0.name');
    expect(joinPath('items', 0, '', 'name')).toBe('items.0.name');
  });

  it('respects segment boundaries when checking a prefix', () => {
    expect(isUnder('name', 'name')).toBe(true);
    expect(isUnder('name.first', 'name')).toBe(true);
    expect(isUnder('nameSuffix', 'name')).toBe(false);
    expect(isUnder('anything', '')).toBe(true);
  });

  it('turns row indexes into stars and matches rows against them', () => {
    expect(patternOf('items.12.tags.0')).toBe('items.*.tags.*');
    expect(matchesPattern('items.3.name', 'items.*.name')).toBe(true);
    expect(matchesPattern('items.x.name', 'items.*.name')).toBe(false);
    expect(matchesPattern('items.3', 'items.*.name')).toBe(false);
  });

  it('speaks the bracket form vee-validate keys its state with', () => {
    expect(toVeePath('items.0.name')).toBe('items[0].name');
    expect(toVeePath('matrix.1.2')).toBe('matrix[1][2]');
    expect(toVeePath('name')).toBe('name');
  });
});
