import { MAX_COLS, MAX_ROWS } from './address';
import type { CellRange, CellValue } from './cell.types';
import type { SharedStrings } from './strings';
import { CELL_ERRORS, EMPTY } from './values';

export const CHUNK_ROWS = 512;

export const CHUNK_COLS = 32;

const CHUNK_SIZE = CHUNK_ROWS * CHUNK_COLS;

const CHUNKS_PER_ROW = MAX_COLS / CHUNK_COLS;

const Kind = { Empty: 0, Number: 1, String: 2, Boolean: 3, Error: 4 } as const;

interface Chunk {
  readonly kinds: Uint8Array;
  numbers: Float64Array | undefined;
  refs: Uint32Array | undefined;
  count: number;
}

export type CellVisitor = (row: number, col: number, value: CellValue) => void;

export interface CellStore {
  get(row: number, col: number): CellValue;
  set(row: number, col: number, value: CellValue): void;
  has(row: number, col: number): boolean;
  forEachInRange(range: CellRange, visit: CellVisitor): void;
  usedRange(): CellRange | undefined;
  nextEdge(row: number, col: number, rowStep: -1 | 0 | 1, colStep: -1 | 0 | 1): number;
  readonly size: number;
  readonly chunks: number;
}

const chunkKey = (row: number, col: number): number =>
  Math.floor(row / CHUNK_ROWS) * CHUNKS_PER_ROW + Math.floor(col / CHUNK_COLS);

const slotOf = (row: number, col: number): number =>
  (row % CHUNK_ROWS) * CHUNK_COLS + (col % CHUNK_COLS);

const newChunk = (): Chunk => ({
  kinds: new Uint8Array(CHUNK_SIZE),
  numbers: undefined,
  refs: undefined,
  count: 0,
});

const numbersOf = (chunk: Chunk): Float64Array => {
  chunk.numbers ??= new Float64Array(CHUNK_SIZE);
  return chunk.numbers;
};

const refsOf = (chunk: Chunk): Uint32Array => {
  chunk.refs ??= new Uint32Array(CHUNK_SIZE);
  return chunk.refs;
};

const read = (chunk: Chunk, slot: number, strings: SharedStrings): CellValue => {
  switch (chunk.kinds[slot]) {
    case Kind.Number:
      return { kind: 'number', value: chunk.numbers?.[slot] ?? 0 };
    case Kind.String:
      return { kind: 'string', value: strings.text(chunk.refs?.[slot] ?? 0) };
    case Kind.Boolean:
      return { kind: 'boolean', value: chunk.numbers?.[slot] === 1 };
    case Kind.Error:
      return { kind: 'error', code: CELL_ERRORS[chunk.refs?.[slot] ?? 0] ?? '#VALUE!' };
    default:
      return EMPTY;
  }
};

const write = (chunk: Chunk, slot: number, value: CellValue, strings: SharedStrings): void => {
  switch (value.kind) {
    case 'number':
      chunk.kinds[slot] = Kind.Number;
      numbersOf(chunk)[slot] = value.value;
      break;
    case 'string':
      chunk.kinds[slot] = Kind.String;
      refsOf(chunk)[slot] = strings.intern(value.value);
      break;
    case 'boolean':
      chunk.kinds[slot] = Kind.Boolean;
      numbersOf(chunk)[slot] = value.value ? 1 : 0;
      break;
    case 'error':
      chunk.kinds[slot] = Kind.Error;
      refsOf(chunk)[slot] = Math.max(0, CELL_ERRORS.indexOf(value.code));
      break;
    case 'empty':
      chunk.kinds[slot] = Kind.Empty;
      break;
  }
};

const clamp = (value: number, max: number): number => Math.min(Math.max(value, 0), max);

const bandsOf = (from: number, to: number, size: number): number[] => {
  const bands: number[] = [];

  for (let band = Math.floor(from / size); band <= Math.floor(to / size); band += 1) {
    bands.push(band);
  }
  return bands;
};

interface Point {
  readonly row: number;
  readonly col: number;
}

const inside = (row: number, col: number): boolean =>
  row >= 0 && row < MAX_ROWS && col >= 0 && col < MAX_COLS;

const along = (point: Point, step: Point): number => (step.row === 0 ? point.col : point.row);

const stepsToNextChunk = (point: Point, step: Point): number => {
  if (step.row !== 0) {
    const inBand = point.row % CHUNK_ROWS;

    return step.row > 0 ? CHUNK_ROWS - inBand : inBand + 1;
  }
  const inBand = point.col % CHUNK_COLS;

  return step.col > 0 ? CHUNK_COLS - inBand : inBand + 1;
};

const pastChunk = (next: Point, step: Point): Point => {
  const jump = stepsToNextChunk(next, step) - 1;

  return {
    row: clamp(next.row + step.row * jump, MAX_ROWS - 1),
    col: clamp(next.col + step.col * jump, MAX_COLS - 1),
  };
};

export const createCellStore = (strings: SharedStrings): CellStore => {
  const chunks = new Map<number, Chunk>();
  let size = 0;

  const filled = (row: number, col: number): boolean =>
    (chunks.get(chunkKey(row, col))?.kinds[slotOf(row, col)] ?? Kind.Empty) !== Kind.Empty;

  const visitChunk = (
    chunk: Chunk,
    band: { readonly row: number; readonly col: number },
    range: CellRange,
    visit: CellVisitor,
  ): void => {
    const top = Math.max(range.top, band.row * CHUNK_ROWS);
    const bottom = Math.min(range.bottom, band.row * CHUNK_ROWS + CHUNK_ROWS - 1);
    const left = Math.max(range.left, band.col * CHUNK_COLS);
    const right = Math.min(range.right, band.col * CHUNK_COLS + CHUNK_COLS - 1);

    for (let row = top; row <= bottom; row += 1) {
      for (let col = left; col <= right; col += 1) {
        const slot = slotOf(row, col);

        if (chunk.kinds[slot] !== Kind.Empty) {
          visit(row, col, read(chunk, slot, strings));
        }
      }
    }
  };

  const scanTo = (start: Point, step: Point, wanted: boolean): number => {
    let point = start;

    while (inside(point.row + step.row, point.col + step.col)) {
      const next = { row: point.row + step.row, col: point.col + step.col };

      if (!wanted && !chunks.has(chunkKey(next.row, next.col))) {
        point = pastChunk(next, step);
      } else if (filled(next.row, next.col) === wanted) {
        point = next;
      } else {
        return along(wanted ? point : next, step);
      }
    }
    return along(point, step);
  };

  return {
    get: (row, col) => {
      const chunk = chunks.get(chunkKey(row, col));

      return chunk === undefined ? EMPTY : read(chunk, slotOf(row, col), strings);
    },
    has: filled,
    set: (row, col, value) => {
      const key = chunkKey(row, col);
      const slot = slotOf(row, col);
      const chunk = chunks.get(key) ?? (value.kind === 'empty' ? undefined : newChunk());

      if (chunk === undefined) {
        return;
      }
      const was = chunk.kinds[slot] !== Kind.Empty;

      write(chunk, slot, value, strings);
      const now = value.kind !== 'empty';

      chunk.count += Number(now) - Number(was);
      size += Number(now) - Number(was);
      if (chunk.count === 0) {
        chunks.delete(key);
      } else {
        chunks.set(key, chunk);
      }
    },
    forEachInRange: (range, visit) => {
      for (const row of bandsOf(range.top, range.bottom, CHUNK_ROWS)) {
        for (const col of bandsOf(range.left, range.right, CHUNK_COLS)) {
          const chunk = chunks.get(row * CHUNKS_PER_ROW + col);

          if (chunk !== undefined) {
            visitChunk(chunk, { row, col }, range, visit);
          }
        }
      }
    },
    usedRange: () => {
      let found: CellRange | undefined;

      for (const [key, chunk] of chunks) {
        const band = { row: Math.floor(key / CHUNKS_PER_ROW), col: key % CHUNKS_PER_ROW };

        const whole = {
          top: band.row * CHUNK_ROWS,
          left: band.col * CHUNK_COLS,
          bottom: band.row * CHUNK_ROWS + CHUNK_ROWS - 1,
          right: band.col * CHUNK_COLS + CHUNK_COLS - 1,
        };

        visitChunk(chunk, band, whole, (row, col) => {
          found = {
            top: Math.min(found?.top ?? row, row),
            left: Math.min(found?.left ?? col, col),
            bottom: Math.max(found?.bottom ?? row, row),
            right: Math.max(found?.right ?? col, col),
          };
        });
      }
      return found;
    },
    nextEdge: (row, col, rowStep, colStep) => {
      const nextFilled =
        inside(row + rowStep, col + colStep) && filled(row + rowStep, col + colStep);

      return scanTo({ row, col }, { row: rowStep, col: colStep }, filled(row, col) && nextFilled);
    },
    get size() {
      return size;
    },
    get chunks() {
      return chunks.size;
    },
  };
};
