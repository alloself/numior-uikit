import { describe, expect, it } from 'vite-plus/test';
import { graphemesOf } from '../src';

describe('graphemesOf', () => {
  it('splits text into the characters a reader sees', () => {
    expect(graphemesOf('Ёж')).toEqual(['Ё', 'ж']);
    expect(graphemesOf('e\u03011')).toEqual(['e\u0301', '1']);
    expect(graphemesOf('👩‍👩‍👧🇷🇺')).toEqual(['👩‍👩‍👧', '🇷🇺']);
    expect(graphemesOf('')).toEqual([]);
  });
});
