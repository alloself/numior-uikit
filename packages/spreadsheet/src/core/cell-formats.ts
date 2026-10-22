import { MAX_COLS, containsCell } from './address';
import type { CellRange } from './cell.types';
import { CHUNK_COLS, CHUNK_ROWS } from './cell-store';
import { shiftIndex, type LineMove } from './lines';

interface FormatChunk {
  readonly ids: Uint16Array;
  count: number;
}

export interface CellFormats {
  get(row: number, col: number): number;
  set(row: number, col: number, id: number): void;
  setRange(range: CellRange, id: number): void;
  forEachInRange(range: CellRange, visit: (row: number, col: number, id: number) => void): void;
  shiftLines(axis: 'rows' | 'cols', at: number, count: number): void;
  lastRow(): number;
  readonly size: number;
}

const CHUNKS_PER_ROW = MAX_COLS / CHUNK_COLS;

const chunkKey = (row: number, col: number): number =>
  Math.floor(row / CHUNK_ROWS) * CHUNKS_PER_ROW + Math.floor(col / CHUNK_COLS);

const slotOf = (row: number, col: number): number =>
  (row % CHUNK_ROWS) * CHUNK_COLS + (col % CHUNK_COLS);

export const createCellFormats = (): CellFormats => {
  const chunks = new Map<number, FormatChunk>();
  let size = 0;

  const set = (row: number, col: number, id: number): void => {
    const key = chunkKey(row, col);
    const known = chunks.get(key);

    if (known === undefined && id === 0) {
      return;
    }

    const chunk = known ?? { ids: new Uint16Array(CHUNK_ROWS * CHUNK_COLS), count: 0 };
    const slot = slotOf(row, col);
    const change = Number(id !== 0) - Number(chunk.ids[slot] !== 0);

    chunk.ids[slot] = id;
    chunk.count += change;
    size += change;
    if (chunk.count === 0) {
      chunks.delete(key);
    } else {
      chunks.set(key, chunk);
    }
  };

  const takeLines = (axis: 'rows' | 'cols', from: number): number[] => {
    const taken: number[] = [];

    chunks.forEach((chunk, key) => {
      const top = Math.floor(key / CHUNKS_PER_ROW) * CHUNK_ROWS;
      const left = (key % CHUNKS_PER_ROW) * CHUNK_COLS;

      chunk.ids.forEach((id, slot) => {
        const row = top + Math.floor(slot / CHUNK_COLS);
        const col = left + (slot % CHUNK_COLS);

        if (id !== 0 && (axis === 'rows' ? row : col) >= from) {
          taken.push(row, col, id);
          set(row, col, 0);
        }
      });
    });

    return taken;
  };

  return {
    shiftLines: (axis, at, count) => {
      const change: LineMove = { axis, at, count };
      const taken = takeLines(axis, at);

      for (let index = 0; index < taken.length; index += 3) {
        const row = taken[index] ?? 0;
        const col = taken[index + 1] ?? 0;
        const line = shiftIndex(axis === 'rows' ? row : col, change);

        if (line !== undefined) {
          set(axis === 'rows' ? line : row, axis === 'rows' ? col : line, taken[index + 2] ?? 0);
        }
      }
    },
    get: (row, col) => chunks.get(chunkKey(row, col))?.ids[slotOf(row, col)] ?? 0,
    set,
    setRange: (range, id) => {
      for (let row = range.top; row <= range.bottom; row += 1) {
        for (let col = range.left; col <= range.right; col += 1) {
          set(row, col, id);
        }
      }
    },
    forEachInRange: (range, visit) => {
      chunks.forEach((chunk, key) => {
        const top = Math.floor(key / CHUNKS_PER_ROW) * CHUNK_ROWS;
        const left = (key % CHUNKS_PER_ROW) * CHUNK_COLS;

        if (
          top > range.bottom ||
          top + CHUNK_ROWS <= range.top ||
          left > range.right ||
          left + CHUNK_COLS <= range.left
        ) {
          return;
        }

        chunk.ids.forEach((id, slot) => {
          const row = top + Math.floor(slot / CHUNK_COLS);
          const col = left + (slot % CHUNK_COLS);

          if (id !== 0 && containsCell(range, row, col)) {
            visit(row, col, id);
          }
        });
      });
    },
    lastRow: () =>
      [...chunks.keys()].reduce(
        (last, key) =>
          Math.max(last, Math.floor(key / CHUNKS_PER_ROW) * CHUNK_ROWS + CHUNK_ROWS - 1),
        -1,
      ),
    get size() {
      return size;
    },
  };
};
