import { containsCell } from '../address';
import type { CellRange } from '../cell.types';
import type { Sheet } from '../workbook';
import { formulaKey } from './graph';

export interface SpillArea {
  readonly sheet: Sheet;
  readonly range: CellRange;
}

export interface SpillCell {
  readonly sheet: Sheet;
  readonly row: number;
  readonly col: number;
}

export interface Spills {
  areaOf(anchor: number): SpillArea | undefined;
  reachOf(anchor: number): SpillArea | undefined;
  occupy(anchor: number, area: SpillArea): void;
  release(anchor: number, clear: (cell: SpillCell) => void): void;
  block(anchor: number, area: SpillArea): void;
  hold(anchor: number, area: SpillArea): void;
  claim(cell: number): number | undefined;
  owns(cell: number): boolean;
  waiting(sheet: Sheet, row: number, col: number, visit: (anchor: number) => void): void;
  forEachArea(visit: (anchor: number, area: SpillArea) => void): void;
}

export const forEachSpillCell = (
  area: SpillArea,
  visit: (cell: SpillCell, key: number) => void,
): void => {
  const { sheet, range } = area;

  for (let row = range.top; row <= range.bottom; row += 1) {
    for (let col = range.left; col <= range.right; col += 1) {
      if (row === range.top && col === range.left) {
        continue;
      }

      visit({ sheet, row, col }, formulaKey(sheet.id, row, col));
    }
  }
};

export const createSpills = (): Spills => {
  const areas = new Map<number, SpillArea>();
  const owners = new Map<number, number>();
  const blocked = new Map<number, SpillArea>();
  const held = new Map<number, SpillArea>();

  return {
    areaOf: (anchor) => areas.get(anchor),
    reachOf: (anchor) => areas.get(anchor) ?? held.get(anchor),
    occupy: (anchor, area) => {
      blocked.delete(anchor);
      held.delete(anchor);
      areas.set(anchor, area);

      forEachSpillCell(area, (_cell, key) => {
        owners.set(key, anchor);
      });
    },
    release: (anchor, clear) => {
      const area = areas.get(anchor);

      blocked.delete(anchor);
      held.delete(anchor);
      areas.delete(anchor);
      if (area === undefined) {
        return;
      }

      forEachSpillCell(area, (cell, key) => {
        if (owners.get(key) !== anchor) {
          return;
        }

        owners.delete(key);
        clear(cell);
      });
    },
    block: (anchor, area) => {
      blocked.set(anchor, area);
    },
    hold: (anchor, area) => {
      held.set(anchor, area);
    },
    claim: (cell) => {
      const owner = owners.get(cell);

      owners.delete(cell);
      return owner;
    },
    owns: (cell) => owners.has(cell),
    forEachArea: (visit) => {
      [...areas, ...blocked, ...held].forEach(([anchor, area]) => {
        visit(anchor, area);
      });
    },
    waiting: (sheet, row, col, visit) => {
      blocked.forEach((area, anchor) => {
        if (area.sheet !== sheet || !containsCell(area.range, row, col)) {
          return;
        }

        visit(anchor);
      });
    },
  };
};
