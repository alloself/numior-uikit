import type { NuiTableRange } from '@numior/table';
import type { CellAddress, CellRange, WorkbookPeer, WorkbookPlace } from '../core';
import type { SheetCells, SheetPeerFrame } from './sheet.types';
import { selectionKey, tableRangeOf } from './use-sheet-selection';

const singleCell = (range: CellRange): boolean =>
  range.top === range.bottom && range.left === range.right;

const covers = (range: NuiTableRange, row: number, col: number): boolean =>
  row >= Math.min(range.from.row, range.to.row) &&
  row <= Math.max(range.from.row, range.to.row) &&
  col >= Math.min(range.from.col, range.to.col) &&
  col <= Math.max(range.from.col, range.to.col);

const activeFrame = (cells: SheetCells, active: CellAddress): NuiTableRange => {
  const range = tableRangeOf(cells, {
    top: active.row,
    left: active.col,
    bottom: active.row,
    right: active.col,
  });

  return cells.merges.find((merge) => covers(merge, range.from.row, range.from.col)) ?? range;
};

export const peerFramesOf = (
  peers: readonly WorkbookPeer[],
  sheet: string | undefined,
  cells: SheetCells | undefined,
): readonly SheetPeerFrame[] =>
  cells === undefined
    ? []
    : peers.reduce<SheetPeerFrame[]>((frames, peer) => {
        if (peer.place === null || peer.place.sheet !== sheet) {
          return frames;
        }

        const cell = activeFrame(cells, peer.place.selection.active);

        frames.push({
          key: peer.clientId,
          name: peer.user.name,
          tone: peer.colour + 1,
          cell,
          areas: peer.place.selection.ranges.reduce<NuiTableRange[]>((areas, range) => {
            if (!singleCell(range)) {
              areas.push(tableRangeOf(cells, range));
            }

            return areas;
          }, []),
          flagBelow: Math.min(cell.from.row, cell.to.row) === 0,
        });

        return frames;
      }, []);

export const placeKey = (place: WorkbookPlace | null): string =>
  place === null ? '' : `${place.sheet}/${selectionKey(place.selection)}`;
