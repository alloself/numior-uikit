import { describe, expect, it } from 'vitest';
import {
  normalizeOtp,
  otpGroups,
  otpLength,
  pasteOtp,
  reconcileOtp,
  selectOtpSlot,
  settleOtpCaret,
} from '../src';

describe('one-time code normalisation', () => {
  it('keeps digits, turns any decimal digit into ASCII and drops the rest', () => {
    expect(normalizeOtp('482 913', 'digits')).toBe('482913');
    expect(normalizeOtp('٤٨٢-۹۱۳', 'digits')).toBe('482913');
    expect(normalizeOtp('४८२९१३', 'digits')).toBe('482913');
    expect(normalizeOtp('４８２', 'digits')).toBe('482');
    expect(normalizeOtp('𝟒𝟖𝟐𝟵𝟭𝟯', 'digits')).toBe('482913');
    expect(normalizeOtp('Code: K7-q', 'digits')).toBe('7');
  });

  it('upper-cases Latin letters for alphanumeric codes and refuses other scripts', () => {
    expect(normalizeOtp('k7qx-9m2a', 'alphanumeric')).toBe('K7QX9M2A');
    expect(normalizeOtp('ＡＢｃ', 'alphanumeric')).toBe('ABC');
    expect(normalizeOtp('кодß½', 'alphanumeric')).toBe('');
  });
});

describe('one-time code layout', () => {
  it('splits the length into groups of the given size', () => {
    expect(otpGroups(6, 3)).toEqual([3, 3]);
    expect(otpGroups(7, 3)).toEqual([3, 3, 1]);
    expect(otpGroups(4)).toEqual([4]);
    expect(otpGroups(4, 10)).toEqual([4]);
    expect(otpGroups(6, 0)).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('treats a broken length as a single slot', () => {
    expect(otpLength(Number.NaN)).toBe(1);
    expect(otpLength(-2)).toBe(1);
    expect(otpLength(5.8)).toBe(5);
    expect(otpGroups(Number.POSITIVE_INFINITY, 2)).toEqual([1]);
  });
});

describe('one-time code selection', () => {
  it('selects a filled slot and keeps the caret after the last character otherwise', () => {
    expect(selectOtpSlot('482', 6, 1)).toEqual({ start: 1, end: 2 });
    expect(selectOtpSlot('482', 6, 5)).toEqual({ start: 3, end: 3 });
    expect(selectOtpSlot('', 6, -1)).toEqual({ start: 0, end: 0 });
    expect(selectOtpSlot('482', 6, -1)).toEqual({ start: 0, end: 1 });
  });

  it('selects the last character of a complete code instead of a caret past it', () => {
    expect(selectOtpSlot('482913', 6, 6)).toEqual({ start: 5, end: 6 });
    expect(selectOtpSlot('482913', 6, 2)).toEqual({ start: 2, end: 3 });
  });

  it('moves on after typing and back after a backward deletion', () => {
    expect(settleOtpCaret('482913', 6, 3, 'forward')).toEqual({ start: 3, end: 4 });
    expect(settleOtpCaret('48913', 6, 2, 'backward')).toEqual({ start: 1, end: 2 });
    expect(settleOtpCaret('48913', 6, 2, 'forward')).toEqual({ start: 2, end: 3 });
    expect(settleOtpCaret('48', 6, 2, 'backward')).toEqual({ start: 2, end: 2 });
    expect(settleOtpCaret('8913', 6, 0, 'backward')).toEqual({ start: 0, end: 1 });
  });
});

describe('one-time code edits', () => {
  it('normalises the native value and keeps the caret behind the same characters', () => {
    expect(reconcileOtp('4 8x2', 5, 6, 'digits')).toEqual({ value: '482', caret: 3 });
    expect(reconcileOtp('48x2', 3, 6, 'digits')).toEqual({ value: '482', caret: 2 });
    expect(reconcileOtp('4829131', 7, 6, 'digits')).toEqual({ value: '482913', caret: 6 });
    expect(reconcileOtp('ab', 1, 6, 'alphanumeric')).toEqual({ value: 'AB', caret: 1 });
  });

  it('replaces the whole code with a pasted complete one', () => {
    const selection = { start: 1, end: 2 };

    expect(pasteOtp('12', 6, selection, 'Your code: 482-913', 'digits')).toEqual({
      value: '482913',
      caret: 6,
    });

    expect(pasteOtp('12', 4, selection, '48291', 'digits')).toEqual({ value: '4829', caret: 4 });
  });

  it('writes a shorter paste over the slots from the selection', () => {
    expect(pasteOtp('123456', 6, { start: 2, end: 3 }, '77', 'digits')).toEqual({
      value: '127756',
      caret: 4,
    });

    expect(pasteOtp('12', 6, { start: 2, end: 2 }, '3 4', 'digits')).toEqual({
      value: '1234',
      caret: 4,
    });

    expect(pasteOtp('12345', 6, { start: 4, end: 5 }, '789', 'digits')).toEqual({
      value: '123478',
      caret: 6,
    });

    expect(pasteOtp('12', 6, { start: 2, end: 2 }, 'abc', 'digits')).toEqual({
      value: '12',
      caret: 2,
    });
  });
});
