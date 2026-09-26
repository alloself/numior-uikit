import { describe, expect, it } from 'vitest';
import { parseTime, timeLayout, timeToDraft, type TimeValue } from '@numior/primitives';
import {
  minuteInterval,
  nearestEnabled,
  pickedTime,
  wheelColumns,
  type WheelInput,
  type WheelOption,
} from '../src/time-field/time-wheels';

const inputFor = (
  locale: string,
  value: string | null,
  options: Partial<Pick<WheelInput, 'seconds' | 'step'>> & { min?: string; max?: string } = {},
): WheelInput => {
  const seconds = options.seconds ?? false;
  const layout = timeLayout(locale, { seconds });

  return {
    layout,
    draft: timeToDraft(parseTime(value), layout.cycle),
    seconds,
    step: options.step ?? 15,
    min: parseTime(options.min),
    max: parseTime(options.max),
  };
};

const optionsAt = (input: WheelInput, index: number): readonly WheelOption[] =>
  wheelColumns(input)[index]?.options ?? [];

const texts = (input: WheelInput, index: number): string[] =>
  optionsAt(input, index).map((option) => option.text);

const dimmed = (input: WheelInput, index: number): string[] =>
  optionsAt(input, index)
    .filter((option) => option.disabled)
    .map((option) => option.text);

const plain = (time: TimeValue): string =>
  `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}:${String(time.second).padStart(2, '0')}`;

describe('time wheels', () => {
  it('steps minutes by the greatest divisor of the step and an hour', () => {
    expect(minuteInterval(15)).toBe(15);
    expect(minuteInterval(45)).toBe(15);
    expect(minuteInterval(90)).toBe(30);
    expect(minuteInterval(7)).toBe(1);
    expect(texts(inputFor('de-DE', null, { step: 20 }), 1)).toEqual(['00', '20', '40']);
  });

  it('keeps only reachable hours and dims the minutes the shown hour cannot reach', () => {
    const late = inputFor('de-DE', '18:00', { min: '09:15', max: '18:30' });

    expect(texts(late, 0)).toEqual(['09', '10', '11', '12', '13', '14', '15', '16', '17', '18']);
    expect(dimmed(late, 1)).toEqual(['45']);
    expect(dimmed(inputFor('de-DE', '09:30', { min: '09:15', max: '18:30' }), 1)).toEqual(['00']);
  });

  it('dims seconds past the edge only when the field shows seconds', () => {
    const edge = inputFor('de-DE', '18:30:00', { seconds: true, step: 1, max: '18:30:20' });
    const seconds = wheelColumns(edge)[2]?.options ?? [];

    expect(seconds.filter((option) => !option.disabled)).toHaveLength(21);
    expect(texts(inputFor('de-DE', null, { min: '09:00:30' }), 0)[0]).toBe('09');
  });

  it('dims a day period and its hours when the range stays on one side of noon', () => {
    const morning = inputFor('en-US', '09:00', { max: '11:30' });

    expect(wheelColumns(morning).map((column) => column.type)).toEqual([
      'hour',
      'minute',
      'dayPeriod',
    ]);

    expect(dimmed(morning, 2)).toEqual(['PM']);
    expect(dimmed(morning, 0)).toEqual([]);

    expect(texts(morning, 0)).toEqual([
      '12',
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
      '09',
      '10',
      '11',
    ]);
  });

  it('puts the locale separator between numeric wheels only', () => {
    expect(wheelColumns(inputFor('en-US', null)).map((column) => column.separator)).toEqual([
      undefined,
      ':',
      undefined,
    ]);
  });

  it('composes a pick with the shown time and clamps it into the range', () => {
    const range = inputFor('de-DE', '17:30', { min: '09:00', max: '18:00', step: 30 });

    expect(plain(pickedTime(range, 'hour', 18))).toBe('18:00:00');
    expect(plain(pickedTime(range, 'minute', 0))).toBe('17:00:00');
    expect(plain(pickedTime(inputFor('en-US', '09:15'), 'dayPeriod', 12))).toBe('21:15:00');
  });

  it('springs from a dimmed option to the nearest one that is enabled', () => {
    const options = [
      { value: 0, text: '00', disabled: false },
      { value: 15, text: '15', disabled: true },
      { value: 30, text: '30', disabled: true },
      { value: 45, text: '45', disabled: false },
    ];

    expect(nearestEnabled(options, 1)).toBe(0);
    expect(nearestEnabled(options, 2)).toBe(3);
    expect(nearestEnabled(options, 3)).toBe(3);
  });
});
