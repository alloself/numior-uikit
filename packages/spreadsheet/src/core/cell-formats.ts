import { containsCell } from './address';
import type { CellRange, LineAxis } from './cell.types';
import {
  CHUNKS_PER_ROW,
  CHUNK_COLS,
  CHUNK_ROWS,
  CHUNK_SIZE,
  chunkKey,
  copyPlane,
  filledSlots,
  shiftChunkLines,
  slotOf,
} from './chunks';

interface FormatChunk {
  readonly ids: Uint16Array;
  count: number;
}

export interface CellFormats {
  get(row: number, col: number): number;
  set(row: number, col: number, id: number): void;
  setRange(range: CellRange, id: number): void;
  forEachInRange(range: CellRange, visit: (row: number, col: number, id: number) => void): void;
  shiftLines(axis: LineAxis, at: number, count: number): void;
  lastRow(): number;
  readonly size: number;
}

const newChunk = (): FormatChunk => ({ ids: new Uint16Array(CHUNK_SIZE), count: 0 });

const moveSlots = (
  source: FormatChunk,
  from: number,
  to: number,
  target: FormatChunk,
  at: number,
): void => {
  copyPlane(source.ids, from, to, target.ids, at);
};

const clearSlots = (chunk: FormatChunk, from: number, to: number): void => {
  chunk.ids.fill(0, from, to);
};

export const createCellFormats = (): CellFormats => {
  const chunks = new Map<number, FormatChunk>();
  let size = 0;

  const set = (row: number, col: number, id: number): void => {
    const key = chunkKey(row, col);
    const known = chunks.get(key);

    if (known === undefined && id === 0) {
      return;
    }

    const chunk = known ?? newChunk();
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
    shiftLines: (axis, at, count) => {
      shiftChunkLines(
        {
          chunks,
          create: newChunk,
          move: moveSlots,
          clear: clearSlots,
          settle: (key, chunk) => {
            const count = filledSlots(chunk.ids);

            size += count - chunk.count;
            chunk.count = count;
            if (count === 0) {
              chunks.delete(key);
            }
          },
        },
        axis,
        at,
        count,
      );
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
