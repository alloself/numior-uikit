import { describe, expect, it } from 'vite-plus/test';
import {
  dateMaskOf,
  graphemesOf,
  maskDateText,
  typeIntoDateText,
  type DateMaskPart,
  type MaskedDateText,
} from '../src';

const RU = dateMaskOf('ru-RU');
const US_TIME = dateMaskOf('en-US', true);

const typed = (keys: string, parts: readonly DateMaskPart[], start = ''): MaskedDateText =>
  graphemesOf(keys).reduce((state, key) => typeIntoDateText(state.text, state.caret, key, parts), {
    text: start,
    caret: start.length,
  });

describe('date mask', () => {
  it('follows the locale pattern and adds hours and minutes for a time', () => {
    expect(RU).toEqual([
      { kind: 'digits', field: 'day', length: 2 },
      { kind: 'literal', text: '.' },
      { kind: 'digits', field: 'month', length: 2 },
      { kind: 'literal', text: '.' },
      { kind: 'digits', field: 'year', length: 4 },
    ]);

    expect(
      dateMaskOf('sv-SE').map((part) => (part.kind === 'digits' ? part.field : part.text)),
    ).toEqual(['year', '-', 'month', '-', 'day']);

    expect(US_TIME.slice(-4)).toEqual([
      { kind: 'literal', text: ' ' },
      { kind: 'digits', field: 'hour', length: 2 },
      { kind: 'literal', text: ':' },
      { kind: 'digits', field: 'minute', length: 2 },
    ]);

    expect(dateMaskOf('ru-RU')).toBe(RU);
  });

  it('places separators after each part while digits are typed', () => {
    expect(typed('0310', RU)).toEqual({ text: '03.10.', caret: 6 });
    expect(typed('03102026', RU)).toEqual({ text: '03.10.2026', caret: 10 });
    expect(typed('031020261', RU)).toEqual({ text: '03.10.2026', caret: 10 });
    expect(typed('122520260930', US_TIME)).toEqual({ text: '12/25/2026 09:30', caret: 16 });
  });

  it('completes a part early when its first digit cannot start a longer one', () => {
    expect(typed('4', RU)).toEqual({ text: '04.', caret: 3 });
    expect(typed('3', RU)).toEqual({ text: '3', caret: 1 });
    expect(typed('35', RU)).toEqual({ text: '35.', caret: 3 });
    expect(typed('312', RU)).toEqual({ text: '31.02.', caret: 6 });
    expect(typed('12252026 9', US_TIME)).toEqual({ text: '12/25/2026 09:', caret: 14 });
  });

  it('closes a short part with a typed separator and swallows letters', () => {
    expect(typed('3.', RU)).toEqual({ text: '03.', caret: 3 });
    expect(typed('3/4', RU)).toEqual({ text: '03.04.', caret: 6 });
    expect(typed('0310', RU, '')).toEqual(typed('03a1b0', RU));
    expect(typed('.', RU, '03.')).toEqual({ text: '03.', caret: 3 });
    expect(typed('2.', RU, '03.10.')).toEqual({ text: '03.10.2', caret: 7 });
  });

  it('writes over the digits of a full date and jumps the separators', () => {
    expect(typeIntoDateText('03.10.2026', 0, '1', RU)).toEqual({ text: '13.10.2026', caret: 1 });
    expect(typeIntoDateText('03.10.2026', 1, '1', RU)).toEqual({ text: '01.10.2026', caret: 3 });
    expect(typeIntoDateText('03.10.2026', 2, '1', RU)).toEqual({ text: '03.10.2026', caret: 4 });
    expect(typeIntoDateText('03.10.2026', 3, '7', RU)).toEqual({ text: '03.07.2026', caret: 6 });
    expect(typeIntoDateText('03.1.2026', 4, '2', RU)).toEqual({ text: '03.12.2026', caret: 5 });
  });

  it('reformats a raw text and keeps the caret after the same digits', () => {
    expect(maskDateText('03102026', 8, RU)).toEqual({ text: '03.10.2026', caret: 10 });
    expect(maskDateText('0310.2026', 2, RU, false)).toEqual({ text: '03.10.2026', caret: 2 });
    expect(maskDateText('03.10', 5, RU, false)).toEqual({ text: '03.10', caret: 5 });
    expect(maskDateText('03.1.2026', 4, RU)).toEqual({ text: '03.1.2026', caret: 4 });
    expect(maskDateText('4', 0, RU, false)).toEqual({ text: '4', caret: 0 });
    expect(maskDateText('', 0, RU)).toEqual({ text: '', caret: 0 });
  });

  it('keeps other digits as typed without zero padding', () => {
    expect(typed('٣.', RU)).toEqual({ text: '٣.', caret: 2 });
    expect(typed('٠٣١٠', RU)).toEqual({ text: '٠٣.١٠.', caret: 6 });
  });
});
