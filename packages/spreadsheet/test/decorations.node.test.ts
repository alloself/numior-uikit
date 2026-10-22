import { describe, expect, it } from 'vite-plus/test';
import { parseCell, type CellDecoration } from '../src/core';
import { openBook } from './book-harness';

const BOLD_YELLOW: CellDecoration = {
  font: { bold: true },
  fill: { pattern: 'solid', foreground: { kind: 'rgb', argb: 'FFFFFF00' } },
};

const decorated = () => {
  const sheet = openBook();
  const cell = parseCell('B3') ?? { row: 0, col: 0 };

  sheet.commit({
    kind: 'setCells',
    sheet: 'Sheet1',
    cells: [
      {
        row: cell.row,
        col: cell.col,
        content: { kind: 'value', value: { kind: 'number', value: 5 } },
        decoration: BOLD_YELLOW,
      },
    ],
  });

  return {
    sheet,
    at: (address: string): CellDecoration => {
      const place = parseCell(address) ?? { row: 0, col: 0 };

      return sheet.book.decorations.get(sheet.first.decorations.get(place.row, place.col));
    },
  };
};

describe('cell decorations', () => {
  it('interns equal decorations once and gives plain cells none', () => {
    const { sheet, at } = decorated();

    expect(at('B3')).toEqual(BOLD_YELLOW);

    expect(sheet.book.decorations.id({ fill: BOLD_YELLOW.fill, font: { bold: true } })).toBe(
      sheet.book.decorations.id(BOLD_YELLOW),
    );

    expect(at('A1')).toEqual({});
  });

  it('moves decorations with inserted and deleted lines and brings them back on undo', () => {
    const { sheet, at } = decorated();

    sheet.insert('2');

    expect([at('B3'), at('B4')]).toEqual([{}, BOLD_YELLOW]);

    sheet.remove('4');

    expect(at('B4')).toEqual({});

    sheet.history.undo();

    expect(at('B4')).toEqual(BOLD_YELLOW);

    sheet.history.undo();
    sheet.history.undo();

    expect(at('B3')).toEqual({});
  });
});
