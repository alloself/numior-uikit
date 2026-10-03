import type { Assoc, MapRange, MapResult, Mapping, StepMap } from './mapping.types';

const untouched = (pos: number): MapResult => ({
  pos,
  deleted: false,
  deletedBefore: false,
  deletedAfter: false,
  deletedAcross: false,
});

const sideOf = (range: MapRange, pos: number, assoc: Assoc): Assoc => {
  if (range.oldSize === 0) {
    return assoc;
  }
  if (pos === range.start) {
    return -1;
  }
  return pos === range.start + range.oldSize ? 1 : assoc;
};

const mapRanges = (ranges: readonly MapRange[], pos: number, assoc: Assoc): MapResult => {
  let diff = 0;

  for (const range of ranges) {
    const end = range.start + range.oldSize;

    if (pos < range.start) {
      break;
    }
    if (pos <= end) {
      const side = sideOf(range, pos, assoc);

      return {
        pos: range.start + diff + (side < 0 ? 0 : range.newSize),
        deleted: assoc < 0 ? pos !== range.start : pos !== end,
        deletedBefore: pos !== range.start,
        deletedAfter: pos !== end,
        deletedAcross: pos > range.start && pos < end,
      };
    }
    diff += range.newSize - range.oldSize;
  }
  return untouched(pos + diff);
};

const mapPosition = (ranges: readonly MapRange[], pos: number, assoc: Assoc): number => {
  let diff = 0;

  for (const range of ranges) {
    if (pos < range.start) {
      break;
    }
    if (pos <= range.start + range.oldSize) {
      return range.start + diff + (sideOf(range, pos, assoc) < 0 ? 0 : range.newSize);
    }
    diff += range.newSize - range.oldSize;
  }
  return pos + diff;
};

const invertRanges = (ranges: readonly MapRange[]): MapRange[] => {
  let diff = 0;

  return ranges.map((range) => {
    const inverted = { start: range.start + diff, oldSize: range.newSize, newSize: range.oldSize };

    diff += range.newSize - range.oldSize;
    return inverted;
  });
};

export const createStepMap = (ranges: readonly MapRange[]): StepMap => {
  const kept = ranges.filter((range) => range.oldSize > 0 || range.newSize > 0);

  const map: StepMap = {
    ranges: kept,
    map: (pos, assoc = 1) => mapPosition(kept, pos, assoc),
    mapResult: (pos, assoc = 1) => mapRanges(kept, pos, assoc),
    invert: () => createStepMap(invertRanges(kept)),
  };

  return map;
};

export const EMPTY_MAP = createStepMap([]);

const merge = (left: MapResult, right: MapResult): MapResult => ({
  pos: right.pos,
  deleted: left.deleted || right.deleted,
  deletedBefore: left.deletedBefore || right.deletedBefore,
  deletedAfter: left.deletedAfter || right.deletedAfter,
  deletedAcross: left.deletedAcross || right.deletedAcross,
});

export const createMapping = (maps: readonly StepMap[] = []): Mapping => {
  const mapResult = (pos: number, assoc: Assoc = 1): MapResult =>
    maps.reduce((result, map) => merge(result, map.mapResult(result.pos, assoc)), untouched(pos));

  return {
    maps,
    map: (pos, assoc = 1) => {
      let current = pos;

      for (const map of maps) {
        current = map.map(current, assoc);
      }
      return current;
    },
    mapResult,
    append: (map) => createMapping([...maps, map]),
    concat: (other) => createMapping([...maps, ...other.maps]),
    invert: () => createMapping(maps.map((map) => map.invert()).toReversed()),
    slice: (from = 0, to = maps.length) => createMapping(maps.slice(from, to)),
  };
};
