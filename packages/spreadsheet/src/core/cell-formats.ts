import { MAX_COLS } from './address';
import type { CellRange } from './cell.types';
import { CHUNK_COLS, CHUNK_ROWS } from './cell-store';

interface FormatChunk {
  readonly ids: Uint16Array;
  count: number;
}

export interface CellFormats {
  get(row: number, col: number): number;
  set(row: number, col: number, id: number): void;
  setRange(range: CellRange, id: number): void;
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

  return {
    get: (row, col) => chunks.get(chunkKey(row, col))?.ids[slotOf(row, col)] ?? 0,
    set,
    setRange: (range, id) => {
      for (let row = range.top; row <= range.bottom; row += 1) {
        for (let col = range.left; col <= range.right; col += 1) {
          set(row, col, id);
        }
      }
    },
    get size() {
      return size;
    },
  };
};
