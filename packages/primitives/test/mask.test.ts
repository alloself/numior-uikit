import { describe, expect, it } from 'vitest';
import { applyMask, maskCaret } from '../src';

const PHONE = '+7 (###) ###-##-##';

describe('input mask', () => {
  it('formats raw characters through the mask and reports completeness', () => {
    expect(applyMask('9991234567', PHONE)).toEqual({
      masked: '+7 (999) 123-45-67',
      raw: '9991234567',
      complete: true,
    });

    expect(applyMask('999', PHONE)).toEqual({ masked: '+7 (999', raw: '999', complete: false });
    expect(applyMask('+7 (999) 12', PHONE).masked).toBe('+7 (999) 12');
    expect(applyMask('99912345678901', PHONE).masked).toBe('+7 (999) 123-45-67');
    expect(applyMask('', PHONE)).toEqual({ masked: '', raw: '', complete: false });
    expect(applyMask('abc', PHONE)).toEqual({ masked: '', raw: '', complete: false });
  });

  it('accepts letters and alphanumerics per token and keeps escaped literals', () => {
    expect(applyMask('ab12', 'AA-##').masked).toBe('ab-12');
    expect(applyMask('a1b2', '**:**').masked).toBe('a1:b2');
    expect(applyMask('7x9', 'A#').masked).toBe('x9');
    expect(applyMask('12', '\\##\\A#').masked).toBe('#1A2');
    expect(applyMask('éя', 'AA').masked).toBe('éя');
  });

  it('places the caret after the given number of accepted characters', () => {
    const masked = applyMask('9991234567', PHONE).masked;
    expect(maskCaret(PHONE, 0, masked.length)).toBe(4);
    expect(maskCaret(PHONE, 3, masked.length)).toBe(7);
    expect(maskCaret(PHONE, 4, masked.length)).toBe(10);
    expect(maskCaret(PHONE, 10, masked.length)).toBe(18);
    expect(maskCaret(PHONE, 3, 5)).toBe(5);
  });
});
