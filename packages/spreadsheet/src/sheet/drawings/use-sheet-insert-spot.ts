import type { NuiTableRange, NuiTableCellPosition } from '@numior/table';
import type { CellAddress, DrawingSize } from '../../core';
import type { InsertSpot, InsertSpotOptions } from './drawings.types';

const VIEW_ACROSS = 0.25;

const VIEW_DOWN = 0.3;

const VIEW_RIGHT = 0.95;

const VIEW_BOTTOM = 0.9;

const FIRST_CELL: NuiTableRange = { from: { row: 0, col: 0 }, to: { row: 0, col: 0 } };

export const useSheetInsertSpot = (options: InsertSpotOptions): InsertSpot => {
  const leadWidth = (): number => options.table.value?.rectOf(FIRST_CELL)?.start ?? 0;

  const pointAcross = (box: DOMRect, across: number): number => {
    const lead = leadWidth();
    const offset = lead + (box.width - lead) * across;

    return options.rtl() ? box.right - offset : box.left + offset;
  };

  const cellInView = (across: number, down: number): NuiTableCellPosition | undefined => {
    const box = options.root.value?.getBoundingClientRect();

    return box === undefined
      ? undefined
      : options.table.value?.cellNear(pointAcross(box, across), box.top + box.height * down);
  };

  const wholeColumn = (cell: NuiTableCellPosition): NuiTableCellPosition => {
    const start = options.table.value?.rectOf({ from: cell, to: cell })?.start ?? 0;
    const scrolled = Math.abs(options.table.value?.scrollPosition().left ?? 0);

    return start < scrolled + leadWidth() ? { ...cell, col: cell.col + 1 } : cell;
  };

  const addressOf = (cell: NuiTableCellPosition | undefined): CellAddress | undefined => {
    const cells = options.cells();

    return cell === undefined || cells === undefined
      ? undefined
      : { row: cells.rowAt(cell.row), col: cells.colAt(cell.col) };
  };

  const start = (): CellAddress | undefined => {
    const near = cellInView(VIEW_ACROSS, VIEW_DOWN);

    return addressOf(near === undefined ? undefined : wholeColumn(near));
  };

  const end = (): CellAddress | undefined => addressOf(cellInView(VIEW_RIGHT, VIEW_BOTTOM));

  const room = (): DrawingSize | undefined => {
    const box = options.root.value?.getBoundingClientRect();
    const lead = leadWidth();

    return box === undefined || box.width === 0
      ? undefined
      : {
          width: (box.width - lead) * (VIEW_RIGHT - VIEW_ACROSS),
          height: box.height * (VIEW_BOTTOM - VIEW_DOWN),
        };
  };

  return { start, end, room };
};
