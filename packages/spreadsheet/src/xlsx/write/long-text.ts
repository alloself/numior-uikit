import { MAX_COLS, MAX_ROWS } from '../../core/address';
import type { Calculator } from '../../core/calc/calculator';
import { CellValueKind, type CellRange } from '../../core/cell.types';
import type { SharedStrings } from '../../core/strings';
import { MAX_CELL_TEXT } from '../../core/values';
import type { Sheet, Workbook } from '../../core/workbook';
import type { XlsxLoss } from './write.types';

const WHOLE: CellRange = { top: 0, left: 0, bottom: MAX_ROWS - 1, right: MAX_COLS - 1 };

const HIGH_SURROGATES = { from: 0xd8_00, to: 0xdb_ff };

const splitsPair = (text: string): boolean => {
  const last = text.charCodeAt(MAX_CELL_TEXT - 1);

  return last >= HIGH_SURROGATES.from && last <= HIGH_SURROGATES.to;
};

export const cellText = (text: string): string =>
  text.length > MAX_CELL_TEXT
    ? text.slice(0, splitsPair(text) ? MAX_CELL_TEXT - 1 : MAX_CELL_TEXT)
    : text;

const holdsLong = (strings: SharedStrings): boolean => {
  for (let id = 0; id < strings.size; id += 1) {
    if (strings.text(id).length > MAX_CELL_TEXT) {
      return true;
    }
  }
  return false;
};

const typedLong = (sheet: Sheet, calculator: Calculator): boolean => {
  let long = false;

  sheet.cells.forEachInRange(WHOLE, (row, col, value) => {
    long ||=
      value.kind === CellValueKind.String &&
      value.value.length > MAX_CELL_TEXT &&
      calculator.formulaAt(sheet, row, col) === undefined;
  });

  return long;
};

export const textLosses = (book: Workbook, calculator: Calculator): XlsxLoss[] =>
  holdsLong(book.strings)
    ? book.sheets.reduce<XlsxLoss[]>((losses, sheet) => {
        if (typedLong(sheet, calculator)) {
          losses.push({ sheet: sheet.name, reason: 'long-text' });
        }
        return losses;
      }, [])
    : [];
