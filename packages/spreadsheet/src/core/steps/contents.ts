import { MAX_COLS, MAX_ROWS, containsCell } from '../address';
import type { Calculator } from '../calc/calculator';
import { CellInputKind, type CellRange } from '../cell.types';
import type { Sheet, Workbook } from '../workbook';
import type { CellEdit } from './step.types';

export const WHOLE_SHEET: CellRange = {
  top: 0,
  left: 0,
  bottom: MAX_ROWS - 1,
  right: MAX_COLS - 1,
};

export const cellKey = (row: number, col: number): number => row * MAX_COLS + col;

export const cellContentsIn = (
  book: Workbook,
  calculator: Calculator,
  sheet: Sheet,
  range: CellRange,
): Map<number, CellEdit> => {
  const found = new Map<number, CellEdit>();

  const add = (row: number, col: number): void => {
    const content = calculator.contentAt(sheet, row, col);
    const format = sheet.formats.get(row, col);
    const decoration = sheet.decorations.get(row, col);

    if (content.kind === CellInputKind.Empty && format === 0 && decoration === 0) {
      return;
    }

    found.set(cellKey(row, col), {
      row,
      col,
      content,
      format: book.formats.code(format),
      decoration: decoration === 0 ? undefined : book.decorations.get(decoration),
    });
  };

  sheet.cells.forEachInRange(range, add);
  sheet.formats.forEachInRange(range, add);
  sheet.decorations.forEachInRange(range, add);

  calculator.forEachFormula((owner, row, col) => {
    if (owner !== sheet || !containsCell(range, row, col)) {
      return;
    }

    add(row, col);
  });

  return found;
};
