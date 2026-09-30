import { describe, expect, it } from 'vitest';
import { csvLine, parseTsv, tsvOf } from '../src/table/table-clipboard';
import { parseBooleanCell, parseDateCell, parseNumberCell } from '../src/table/table-parse';
import { planPaste } from '../src/table/table-paste';

const BOUNDS = { rows: 10, cols: 4 };
const TEXTS = { yes: 'Да', no: 'Нет' };

const range = (top: number, start: number, bottom: number, end: number) => ({
  from: { row: top, col: start },
  to: { row: bottom, col: end },
});

const utc = (year: number, month: number, day: number): Date =>
  new Date(Date.UTC(year, month, day));

describe('table paste', () => {
  it('reads tab separated text with Excel quoting and round-trips what the table copies', () => {
    const lines = [
      ['a', 'b\tc'],
      ['say "hi"', 'x\ny'],
    ];

    expect(parseTsv(tsvOf(lines))).toEqual(lines);

    expect(parseTsv('1\t2\r\n3\t4\r\n')).toEqual([
      ['1', '2'],
      ['3', '4'],
    ]);

    expect(parseTsv('a\n\nb')).toEqual([['a'], [''], ['b']]);
    expect(parseTsv('ab"c')).toEqual([['ab"c']]);
    expect(parseTsv('')).toEqual([]);
  });

  it('writes CSV lines with quotes only where a field needs them', () => {
    expect(csvLine(['a', 'b,c', 'say "hi"', 'x\ny', ' pad', 'ok'], ',')).toBe(
      'a,"b,c","say ""hi""","x\ny"," pad",ok',
    );

    expect(csvLine(['a;b', 'c,d'], ';')).toBe('"a;b";c,d');
  });

  it('pastes at the anchor, fills the selection with one value and repeats a block over a multiple', () => {
    expect(planPaste([['a', 'b']], [], { row: 2, col: 1 }, BOUNDS, 100)).toEqual({
      kind: 'cells',
      cells: [
        { row: 2, col: 1, text: 'a' },
        { row: 2, col: 2, text: 'b' },
      ],
      area: range(2, 1, 2, 2),
    });

    expect(
      planPaste([['x']], [range(1, 0, 2, 0), range(5, 3, 5, 3)], undefined, BOUNDS, 100),
    ).toEqual({
      kind: 'cells',
      cells: [
        { row: 1, col: 0, text: 'x' },
        { row: 2, col: 0, text: 'x' },
        { row: 5, col: 3, text: 'x' },
      ],
      area: undefined,
    });

    const tiled = planPaste([['1'], ['2']], [range(0, 0, 3, 0)], undefined, BOUNDS, 100);

    expect(tiled.kind === 'cells' ? tiled.cells.map((cell) => cell.text) : []).toEqual([
      '1',
      '2',
      '1',
      '2',
    ]);
  });

  it('clips the block at the table edge, keeps within the limit and ignores an empty clipboard', () => {
    const clipped = planPaste([['a', 'b', 'c']], [], { row: 9, col: 2 }, BOUNDS, 100);

    expect(clipped).toEqual({
      kind: 'cells',
      cells: [
        { row: 9, col: 2, text: 'a' },
        { row: 9, col: 3, text: 'b' },
      ],
      area: range(9, 2, 9, 3),
    });

    expect(
      planPaste(
        [
          ['a', 'b'],
          ['c', 'd'],
        ],
        [],
        { row: 0, col: 0 },
        BOUNDS,
        3,
      ),
    ).toEqual({
      kind: 'limit',
      count: 4,
    });

    expect(planPaste([], [], { row: 0, col: 0 }, BOUNDS, 100)).toEqual({ kind: 'none' });
    expect(planPaste([['a']], [], undefined, BOUNDS, 100)).toEqual({ kind: 'none' });
  });

  it('reads numbers, dates and booleans the way the table shows them and refuses the rest', () => {
    expect(parseNumberCell('1 234,5', 'ru-RU')).toEqual({ kind: 'value', value: 1234.5 });
    expect(parseNumberCell('12 400 ₽', 'ru-RU')).toEqual({ kind: 'value', value: 12400 });
    expect(parseNumberCell('−5', 'ru-RU')).toEqual({ kind: 'value', value: -5 });
    expect(parseNumberCell('', 'ru-RU')).toEqual({ kind: 'value', value: null });
    expect(parseNumberCell('abc', 'ru-RU')).toEqual({ kind: 'invalid' });

    expect(parseDateCell('2026-09-30', 'ru-RU')).toEqual({
      kind: 'value',
      value: utc(2026, 8, 30),
    });

    expect(parseDateCell('30.09.2026', 'ru-RU')).toEqual({
      kind: 'value',
      value: utc(2026, 8, 30),
    });

    const shown = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeZone: 'UTC' });

    expect(parseDateCell(shown.format(utc(2026, 8, 30)), 'ru-RU')).toEqual({
      kind: 'value',
      value: utc(2026, 8, 30),
    });

    expect(parseDateCell('Sep 30, 2026', 'en-US')).toEqual({
      kind: 'value',
      value: utc(2026, 8, 30),
    });

    expect(parseDateCell('31 февр. 2026 г.', 'ru-RU')).toEqual({ kind: 'invalid' });
    expect(parseBooleanCell('да', TEXTS)).toEqual({ kind: 'value', value: true });
    expect(parseBooleanCell('Нет', TEXTS)).toEqual({ kind: 'value', value: false });
    expect(parseBooleanCell('false', TEXTS)).toEqual({ kind: 'value', value: false });
    expect(parseBooleanCell('может быть', TEXTS)).toEqual({ kind: 'invalid' });
  });
});
