import { describe, expect, it } from 'vite-plus/test';
import {
  blockDecoration,
  createStepMap,
  decorationSet,
  emptyDecorations,
  inlineDecoration,
} from '../src';

const rangesOf = (set: ReturnType<typeof decorationSet>): string[] =>
  set.decorations.map((decoration) => `${decoration.class}:${decoration.from}-${decoration.to}`);

describe('decoration sets', () => {
  it('sort by start and drop empty ranges and classes', () => {
    const set = decorationSet([
      inlineDecoration(8, 10, 'b'),
      inlineDecoration(2, 4, 'a'),
      inlineDecoration(5, 5, 'empty'),
      inlineDecoration(6, 7, ''),
    ]);

    expect(rangesOf(set)).toEqual(['a:2-4', 'b:8-10']);
    expect(emptyDecorations.decorations).toEqual([]);
  });

  it('grow with text typed inside, shift with text before and vanish with deleted text', () => {
    const set = decorationSet([inlineDecoration(2, 4, 'a'), inlineDecoration(8, 10, 'b')]);

    expect(rangesOf(set.map(createStepMap([{ start: 3, oldSize: 0, newSize: 2 }])))).toEqual([
      'a:2-6',
      'b:10-12',
    ]);

    expect(rangesOf(set.map(createStepMap([{ start: 1, oldSize: 4, newSize: 0 }])))).toEqual([
      'b:4-6',
    ]);
  });

  it('keep decorations anchored to a block through any mapping', () => {
    const set = decorationSet(
      [],
      [blockDecoration('b1', 0, 3, 'kw'), blockDecoration('b1', 2, 2, 'gone')],
    );

    expect(set.map(createStepMap([{ start: 0, oldSize: 5, newSize: 0 }])).blocks).toEqual([
      blockDecoration('b1', 0, 3, 'kw'),
    ]);
  });
});
