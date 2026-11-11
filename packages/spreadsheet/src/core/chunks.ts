import { MAX_COLS, MAX_ROWS } from './address';
import { LineAxis } from './cell.types';

export type ChunkPlane = Uint8Array | Uint16Array | Uint32Array | Float64Array;

export interface ChunkShift<C> {
  readonly chunks: Map<number, C>;
  readonly create: () => C;
  readonly move: (source: C, from: number, to: number, target: C, at: number) => void;
  readonly clear: (chunk: C, from: number, to: number) => void;
  readonly settle: (key: number, chunk: C) => void;
}

interface Run<C> {
  readonly from: number;
  readonly to: number;
  readonly source: C | undefined;
  readonly sourceFrom: number;
}

interface Shift {
  readonly rows: boolean;
  readonly span: number;
  readonly limit: number;
  readonly at: number;
  readonly count: number;
}

export const CHUNK_ROWS = 512;

export const CHUNK_COLS = 32;

export const CHUNK_SIZE = CHUNK_ROWS * CHUNK_COLS;

export const CHUNKS_PER_ROW = MAX_COLS / CHUNK_COLS;

const SHORT_RUN = 8;

const WORD_BYTES = 4;

const LOW_BITS = 0x7f7f7f7f;

const HIGH_BITS = 0x80808080;

const HIGH_BIT = 7;

const BYTE_ONES = 0x01010101;

const TOP_BYTE = 24;

export const chunkKey = (row: number, col: number): number =>
  Math.floor(row / CHUNK_ROWS) * CHUNKS_PER_ROW + Math.floor(col / CHUNK_COLS);

export const slotOf = (row: number, col: number): number =>
  (row % CHUNK_ROWS) * CHUNK_COLS + (col % CHUNK_COLS);

export const copyPlane = <P extends ChunkPlane>(
  source: P,
  from: number,
  to: number,
  target: P,
  at: number,
): void => {
  if (source === target) {
    target.copyWithin(at, from, to);
    return;
  }
  if (to - from > SHORT_RUN) {
    target.set(source.subarray(from, to), at);
    return;
  }
  for (let offset = 0; offset < to - from; offset += 1) {
    target[at + offset] = source[from + offset] ?? 0;
  }
};

const keyOf = (shift: Shift, strip: number, index: number): number =>
  shift.rows ? index * CHUNKS_PER_ROW + strip : strip * CHUNKS_PER_ROW + index;

const targetsOf = <C>(chunks: ReadonlyMap<number, C>, shift: Shift): Map<number, Set<number>> => {
  const first = Math.floor(shift.at / shift.span);
  const kept = shift.count > 0 ? shift.at : shift.at - shift.count;
  const strips = new Map<number, Set<number>>();

  chunks.forEach((_, key) => {
    const band = Math.floor(key / CHUNKS_PER_ROW);
    const column = key % CHUNKS_PER_ROW;
    const index = shift.rows ? band : column;
    const strip = shift.rows ? column : band;

    if (index < first) {
      return;
    }
    const targets = strips.get(strip) ?? new Set<number>();
    const low = Math.floor((Math.max(index * shift.span, kept) + shift.count) / shift.span);
    const high = Math.floor((index * shift.span + shift.span - 1 + shift.count) / shift.span);

    targets.add(index);
    for (let target = low; target <= Math.min(high, shift.limit - 1); target += 1) {
      targets.add(target);
    }
    strips.set(strip, targets);
  });

  return strips;
};

const runsOf = <C>(
  chunks: ReadonlyMap<number, C>,
  shift: Shift,
  strip: number,
  index: number,
): Run<C>[] => {
  const base = index * shift.span;
  const end = base + shift.span;
  const gap = shift.count > 0 ? shift.at + shift.count : shift.at;
  const runs: Run<C>[] = [];
  let line = Math.max(base, shift.at);

  while (line < end) {
    const from = line - base;

    if (line < gap) {
      line = Math.min(end, gap);
      runs.push({ from, to: line - base, source: undefined, sourceFrom: 0 });
    } else {
      const sourceLine = line - shift.count;
      const sourceIndex = Math.floor(sourceLine / shift.span);

      line = Math.min(end, (sourceIndex + 1) * shift.span + shift.count);

      runs.push({
        from,
        to: line - base,
        source:
          sourceIndex < shift.limit ? chunks.get(keyOf(shift, strip, sourceIndex)) : undefined,
        sourceFrom: sourceLine - sourceIndex * shift.span,
      });
    }
  }
  return runs;
};

const filledBytes = (plane: Uint8Array): number => {
  const words = new Uint32Array(plane.buffer, plane.byteOffset, plane.length / WORD_BYTES);
  let count = 0;

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index] ?? 0;

    if (word === 0) {
      continue;
    }

    const marks = (((word & LOW_BITS) + LOW_BITS) | word) & HIGH_BITS;

    count += Math.imul(marks >>> HIGH_BIT, BYTE_ONES) >>> TOP_BYTE;
  }
  return count;
};

const filledItems = (plane: ChunkPlane): number => {
  let count = 0;

  for (let slot = 0; slot < plane.length; slot += 1) {
    count += Number(plane[slot] !== 0);
  }
  return count;
};

const wordAligned = (plane: ChunkPlane): plane is Uint8Array =>
  plane instanceof Uint8Array &&
  plane.byteOffset % WORD_BYTES === 0 &&
  plane.length % WORD_BYTES === 0;

export const filledSlots = (plane: ChunkPlane): number =>
  wordAligned(plane) ? filledBytes(plane) : filledItems(plane);

const applyRun = <C>(
  ops: ChunkShift<C>,
  rows: boolean,
  target: C,
  run: Run<C>,
  whole: boolean,
): void => {
  if (!rows && whole && run.source === target) {
    ops.move(target, run.sourceFrom, CHUNK_SIZE - run.from, target, run.from);
    return;
  }
  const width = rows ? CHUNK_COLS : 1;
  const step = rows ? CHUNK_SIZE : CHUNK_COLS;
  const length = (run.to - run.from) * width;

  for (let base = 0; base < CHUNK_SIZE; base += step) {
    const at = base + run.from * width;

    if (run.source === undefined) {
      ops.clear(target, at, at + length);
    } else {
      const from = base + run.sourceFrom * width;

      ops.move(run.source, from, from + length, target, at);
    }
  }
};

export const shiftChunkLines = <C>(
  ops: ChunkShift<C>,
  axis: LineAxis,
  at: number,
  count: number,
): void => {
  const rows = axis === LineAxis.Rows;
  const span = rows ? CHUNK_ROWS : CHUNK_COLS;
  const shift: Shift = { rows, span, limit: (rows ? MAX_ROWS : MAX_COLS) / span, at, count };

  targetsOf(ops.chunks, shift).forEach((targets, strip) => {
    const ordered = [...targets].toSorted((left, right) =>
      count > 0 ? right - left : left - right,
    );

    for (const index of ordered) {
      const key = keyOf(shift, strip, index);
      const known = ops.chunks.get(key);
      const runs = runsOf(ops.chunks, shift, strip, index);

      if (known === undefined && !runs.some((run) => run.source !== undefined)) {
        continue;
      }

      const target = known ?? ops.create();

      ops.chunks.set(key, target);

      const whole = runs[0]?.from === 0;

      (count > 0 ? runs.toReversed() : runs).forEach((run) => {
        applyRun(ops, rows, target, run, whole);
      });

      ops.settle(key, target);
    }
  });
};
