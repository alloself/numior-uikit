import { MAX_COLS, MAX_ROWS } from './address';
import { CellValueKind, type LineAxis, type CellRange, type CellValue } from './cell.types';
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
import type { SharedStrings } from './strings';
import { CELL_ERRORS, EMPTY } from './values';

interface Chunk {
  readonly kinds: Uint8Array;
  numbers: Float64Array | undefined;
  refs: Uint32Array | undefined;
  count: number;
  stamp: number;
}

export type CellVisitor = (row: number, col: number, value: CellValue) => void;

export type ChunkVisitor = (stamp: number, area: CellRange) => void;

export interface CellStore {
  get(row: number, col: number): CellValue;
  set(row: number, col: number, value: CellValue): void;
  has(row: number, col: number): boolean;
  forEachInRange(range: CellRange, visit: CellVisitor): void;
  forEachChunk(range: CellRange, visit: ChunkVisitor): void;
  usedRange(): CellRange | undefined;
  lastRow(): number;
  nextEdge(row: number, col: number, rowStep: -1 | 0 | 1, colStep: -1 | 0 | 1): number;
  shiftLines(axis: LineAxis, at: number, count: number): void;
  readonly size: number;
  readonly revision: number;
  readonly chunks: number;
}

interface Point {
  readonly row: number;
  readonly col: number;
}

export { CHUNK_COLS, CHUNK_ROWS };

const Kind = { Empty: 0, Number: 1, String: 2, Boolean: 3, Error: 4 } as const;

const newChunk = (): Chunk => ({
  kinds: new Uint8Array(CHUNK_SIZE),
  numbers: undefined,
  refs: undefined,
  count: 0,
  stamp: 0,
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
    case CellValueKind.Number:
      chunk.kinds[slot] = Kind.Number;
      numbersOf(chunk)[slot] = value.value;
      break;
    case CellValueKind.String:
      chunk.kinds[slot] = Kind.String;
      refsOf(chunk)[slot] = strings.intern(value.value);
      break;
    case CellValueKind.Boolean:
      chunk.kinds[slot] = Kind.Boolean;
      numbersOf(chunk)[slot] = value.value ? 1 : 0;
      break;
    case CellValueKind.Error:
      chunk.kinds[slot] = Kind.Error;
      refsOf(chunk)[slot] = Math.max(0, CELL_ERRORS.indexOf(value.code));
      break;
    case CellValueKind.Empty:
      chunk.kinds[slot] = Kind.Empty;
      break;
  }
};

const moveSlots = (source: Chunk, from: number, to: number, target: Chunk, at: number): void => {
  copyPlane(source.kinds, from, to, target.kinds, at);
  if (source.numbers !== undefined) {
    copyPlane(source.numbers, from, to, numbersOf(target), at);
  }
  if (source.refs !== undefined) {
    copyPlane(source.refs, from, to, refsOf(target), at);
  }
};

const clearSlots = (chunk: Chunk, from: number, to: number): void => {
  chunk.kinds.fill(Kind.Empty, from, to);
};

const clamp = (value: number, max: number): number => Math.min(Math.max(value, 0), max);

const bandsOf = (from: number, to: number, size: number): number[] => {
  const bands: number[] = [];

  for (let band = Math.floor(from / size); band <= Math.floor(to / size); band += 1) {
    bands.push(band);
  }
  return bands;
};

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

  const visitBand = (
    present: readonly { readonly chunk: Chunk; readonly col: number }[],
    band: number,
    range: CellRange,
    visit: CellVisitor,
  ): void => {
    const top = Math.max(range.top, band * CHUNK_ROWS);
    const bottom = Math.min(range.bottom, band * CHUNK_ROWS + CHUNK_ROWS - 1);

    for (let row = top; row <= bottom; row += 1) {
      for (const { chunk, col: columnBand } of present) {
        const left = Math.max(range.left, columnBand * CHUNK_COLS);
        const right = Math.min(range.right, columnBand * CHUNK_COLS + CHUNK_COLS - 1);

        for (let col = left; col <= right; col += 1) {
          const slot = slotOf(row, col);

          if (chunk.kinds[slot] !== Kind.Empty) {
            visit(row, col, read(chunk, slot, strings));
          }
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

  let revision = 0;

  return {
    shiftLines: (axis, at, count) => {
      revision += 1;

      shiftChunkLines(
        {
          chunks,
          create: newChunk,
          move: moveSlots,
          clear: clearSlots,
          settle: (key, chunk) => {
            const count = filledSlots(chunk.kinds);

            size += count - chunk.count;
            chunk.count = count;
            chunk.stamp = revision;
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
    get: (row, col) => {
      const chunk = chunks.get(chunkKey(row, col));

      return chunk === undefined ? EMPTY : read(chunk, slotOf(row, col), strings);
    },
    has: filled,
    set: (row, col, value) => {
      const key = chunkKey(row, col);

      revision += 1;
      const slot = slotOf(row, col);

      const chunk =
        chunks.get(key) ?? (value.kind === CellValueKind.Empty ? undefined : newChunk());

      if (chunk === undefined) {
        return;
      }
      const was = chunk.kinds[slot] !== Kind.Empty;

      write(chunk, slot, value, strings);
      chunk.stamp = revision;
      const now = value.kind !== CellValueKind.Empty;

      chunk.count += Number(now) - Number(was);
      size += Number(now) - Number(was);
      if (chunk.count === 0) {
        chunks.delete(key);
      } else {
        chunks.set(key, chunk);
      }
    },
    forEachInRange: (range, visit) => {
      const columns = bandsOf(range.left, range.right, CHUNK_COLS);

      for (const band of bandsOf(range.top, range.bottom, CHUNK_ROWS)) {
        const present = columns.flatMap((col) => {
          const chunk = chunks.get(band * CHUNKS_PER_ROW + col);

          return chunk === undefined ? [] : [{ chunk, col }];
        });

        if (present.length > 0) {
          visitBand(present, band, range, visit);
        }
      }
    },
    forEachChunk: (range, visit) => {
      const columns = bandsOf(range.left, range.right, CHUNK_COLS);

      for (const band of bandsOf(range.top, range.bottom, CHUNK_ROWS)) {
        for (const col of columns) {
          const chunk = chunks.get(band * CHUNKS_PER_ROW + col);

          if (chunk !== undefined) {
            visit(chunk.stamp, {
              top: Math.max(range.top, band * CHUNK_ROWS),
              left: Math.max(range.left, col * CHUNK_COLS),
              bottom: Math.min(range.bottom, band * CHUNK_ROWS + CHUNK_ROWS - 1),
              right: Math.min(range.right, col * CHUNK_COLS + CHUNK_COLS - 1),
            });
          }
        }
      }
    },
    usedRange: () => {
      const bounds = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, -1, -1];

      const widen = (row: number, col: number): void => {
        bounds[0] = Math.min(bounds[0] ?? row, row);
        bounds[1] = Math.min(bounds[1] ?? col, col);
        bounds[2] = Math.max(bounds[2] ?? row, row);
        bounds[3] = Math.max(bounds[3] ?? col, col);
      };

      for (const [key, chunk] of chunks) {
        const band = { row: Math.floor(key / CHUNKS_PER_ROW), col: key % CHUNKS_PER_ROW };

        const whole = {
          top: band.row * CHUNK_ROWS,
          left: band.col * CHUNK_COLS,
          bottom: band.row * CHUNK_ROWS + CHUNK_ROWS - 1,
          right: band.col * CHUNK_COLS + CHUNK_COLS - 1,
        };

        visitChunk(chunk, band, whole, widen);
      }

      const [top = 0, left = 0, bottom = -1, right = -1] = bounds;

      return bottom < 0 ? undefined : { top, left, bottom, right };
    },
    lastRow: () =>
      [...chunks.keys()].reduce(
        (last, key) =>
          Math.max(last, Math.floor(key / CHUNKS_PER_ROW) * CHUNK_ROWS + CHUNK_ROWS - 1),
        -1,
      ),
    nextEdge: (row, col, rowStep, colStep) => {
      const nextFilled =
        inside(row + rowStep, col + colStep) && filled(row + rowStep, col + colStep);

      return scanTo({ row, col }, { row: rowStep, col: colStep }, filled(row, col) && nextFilled);
    },
    get size() {
      return size;
    },
    get revision() {
      return revision;
    },
    get chunks() {
      return chunks.size;
    },
  };
};
