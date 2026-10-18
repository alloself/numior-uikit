import { describe, expect, it } from 'vite-plus/test';
import {
  EMPTY,
  booleanValue,
  errorValue,
  isCellError,
  numberValue,
  sameValue,
  textValue,
} from '../src/core';

describe('cell values', () => {
  it('compares values by kind and content and knows the Excel error codes', () => {
    expect(sameValue(numberValue(1), numberValue(1))).toBe(true);
    expect(sameValue(numberValue(1), textValue('1'))).toBe(false);
    expect(sameValue(textValue('a'), textValue('b'))).toBe(false);
    expect(sameValue(booleanValue(true), booleanValue(true))).toBe(true);
    expect(sameValue(EMPTY, EMPTY)).toBe(true);
    expect(sameValue(EMPTY, numberValue(0))).toBe(false);
    expect(sameValue(errorValue('#N/A'), errorValue('#N/A'))).toBe(true);
    expect(sameValue(errorValue('#N/A'), errorValue('#REF!'))).toBe(false);
    expect(sameValue(errorValue('#N/A'), EMPTY)).toBe(false);

    expect(['#DIV/0!', '#SPILL!', '#OOPS', 'N/A'].map(isCellError)).toEqual([
      true,
      true,
      false,
      false,
    ]);
  });
});
