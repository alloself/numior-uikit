import { sumBy } from 'lodash-es';
import {
  NuiTableAlign,
  NuiTablePin,
  TablePlacementKind,
  type TableCellLayout,
  type TableCellPaint,
  type TablePaneName,
} from './table.types';

export interface TableFloodLine {
  readonly count: number;
  readonly paneAt: (col: number) => TablePaneName | undefined;
  readonly widthAt: (col: number) => number;
  readonly textAt: (col: number) => string | undefined;
  readonly alignAt: (col: number) => NuiTableAlign | undefined;
  readonly needAt: (col: number) => number;
}

export interface TableFloodView {
  readonly line: TableFloodLine;
  readonly paintAt: (col: number) => TableCellPaint | undefined;
}

export interface TableSpill {
  readonly origin: number;
  readonly align: NuiTableAlign;
  readonly shift: number;
  readonly seam: boolean;
}

export interface TableFloodRun {
  readonly pane: TablePaneName;
  readonly first: number;
  readonly last: number;
}

export interface TableGroupFloodColumn {
  readonly key: string;
  readonly pane: TablePaneName;
  readonly width: number;
}

export interface TableGroupFlood {
  readonly columns: readonly TableGroupFloodColumn[];
  readonly origin: number;
  readonly text: string;
  readonly need: number;
  readonly blocked: (key: string) => boolean;
}

interface Flood {
  readonly first: number;
  readonly last: number;
}

const FLOOD_REACH = 4096;

const TEXT_PROPERTIES = ['font-weight', 'font-style', 'font-size', 'text-decoration-line'];

export const alignOfCell = (cell: TableCellLayout | undefined): NuiTableAlign =>
  cell === undefined || cell.kind === TablePlacementKind.Gap ? NuiTableAlign.Start : cell.align;

export const closingLineOf = (cell: TableCellLayout | undefined, last: boolean): string => {
  if (last || cell === undefined || cell.kind === TablePlacementKind.Gap) {
    return '0px';
  }
  if (cell.tail === true) {
    return 'calc(var(--_grid) * var(--_slack))';
  }
  return cell.pin === NuiTablePin.Start && cell.edge ? '1px' : 'var(--_grid)';
};

export const spillClasses = (spill: TableSpill): readonly unknown[] => [
  'nui-table__cell--spill',
  { 'nui-table__cell--seamless': spill.seam },
];

const textValue = (
  origin: TableCellPaint | undefined,
  cell: TableCellPaint | undefined,
  name: string,
  own: string,
): [string, string][] => {
  const value = origin?.style[own];

  return value === undefined && cell?.style[own] === undefined ? [] : [[name, value ?? 'inherit']];
};

export const spillStyleOf = (
  origin: TableCellPaint | undefined,
  cell: TableCellPaint | undefined,
): Record<string, string> =>
  Object.fromEntries([
    ...textValue(origin, cell, 'color', '--_ink'),
    ...TEXT_PROPERTIES.flatMap((name) => textValue(origin, cell, name, name)),
  ]);

const filled = (line: TableFloodLine, col: number): boolean => {
  const text = line.textAt(col);

  return text !== undefined && text !== '';
};

const flowing = (line: TableFloodLine, col: number, toward: NuiTableAlign): boolean => {
  const align = line.alignAt(col);

  return filled(line, col) && (align === toward || align === NuiTableAlign.Center);
};

const beyond = (
  line: TableFloodLine,
  run: TableFloodRun,
  step: 1 | -1,
  toward: NuiTableAlign,
): number | undefined => {
  const edge = step === 1 ? run.last : run.first;
  let reach = 0;
  let col = edge + step;

  if (line.textAt(edge) !== '') {
    return undefined;
  }
  while (col >= 0 && col < line.count && line.paneAt(col) === run.pane && reach < FLOOD_REACH) {
    if (line.textAt(col) !== '') {
      return flowing(line, col, toward) ? col : undefined;
    }
    reach += line.widthAt(col);
    col += step;
  }
  return undefined;
};

const originsOf = (line: TableFloodLine, runs: readonly TableFloodRun[]): number[] => {
  const origins = new Set<number>();

  for (const run of runs) {
    for (let col = run.first; col <= run.last; col += 1) {
      if (line.alignAt(col) === undefined || !filled(line, col)) {
        continue;
      }

      origins.add(col);
    }
    for (const found of [
      beyond(line, run, -1, NuiTableAlign.Start),
      beyond(line, run, 1, NuiTableAlign.End),
    ]) {
      if (found === undefined) {
        continue;
      }

      origins.add(found);
    }
  }
  return [...origins].toSorted((left, right) => left - right);
};

const reachOf = (
  line: TableFloodLine,
  free: (col: number) => boolean,
  origin: number,
  step: 1 | -1,
  room: number,
): number => {
  let edge = origin;
  let width = 0;

  for (let col = origin + step; width < room && free(col); col += step) {
    edge = col;
    width += line.widthAt(col);
  }
  return edge;
};

const floodOf = (
  line: TableFloodLine,
  free: (col: number) => boolean,
  origin: number,
  align: NuiTableAlign,
): Flood | undefined => {
  const own = line.widthAt(origin);
  const room = Math.min(line.needAt(origin), FLOOD_REACH) - own;

  if (room <= 0) {
    return undefined;
  }
  switch (align) {
    case NuiTableAlign.Start:
      return { first: origin, last: reachOf(line, free, origin, 1, room) };
    case NuiTableAlign.End:
      return { first: reachOf(line, free, origin, -1, room), last: origin };
    case NuiTableAlign.Center:
      return {
        first: reachOf(line, free, origin, -1, room / 2),
        last: reachOf(line, free, origin, 1, room / 2),
      };
  }
};

const shiftOf = (align: NuiTableAlign, cell: number, width: number, own: number): number => {
  switch (align) {
    case NuiTableAlign.Start:
      return 0 - cell;
    case NuiTableAlign.End:
      return cell + width - own;
    case NuiTableAlign.Center:
      return own - 2 * cell - width;
  }
};

const spill = (
  line: TableFloodLine,
  spills: Map<number, TableSpill>,
  origin: number,
  align: NuiTableAlign,
  flood: Flood,
): void => {
  const own = line.widthAt(origin);
  let cell = 0;

  for (let col = origin - 1; col >= flood.first; col -= 1) {
    cell -= line.widthAt(col);
  }
  for (let col = flood.first; col <= flood.last; col += 1) {
    const width = line.widthAt(col);

    spills.set(col, {
      origin,
      align,
      shift: shiftOf(align, cell, width, own),
      seam: col < flood.last,
    });

    cell += width;
  }
};

export const spillsOf = (
  line: TableFloodLine,
  runs: readonly TableFloodRun[],
): ReadonlyMap<number, TableSpill> => {
  const spills = new Map<number, TableSpill>();

  for (const origin of originsOf(line, runs)) {
    const align = line.alignAt(origin);
    const pane = line.paneAt(origin);

    const free = (col: number): boolean =>
      col >= 0 &&
      col < line.count &&
      line.paneAt(col) === pane &&
      !spills.has(col) &&
      line.textAt(col) === '';

    const flood = align === undefined ? undefined : floodOf(line, free, origin, align);

    if (align === undefined || flood === undefined || flood.first >= flood.last) {
      continue;
    }

    spill(line, spills, origin, align, flood);
  }
  return spills;
};

export const groupLineOf = (flood: TableGroupFlood): TableFloodLine => {
  const { columns, origin } = flood;

  const textAt = (col: number): string | undefined => {
    const column = columns[col];

    if (col === origin) {
      return flood.text;
    }
    return column === undefined || flood.blocked(column.key) ? undefined : '';
  };

  return {
    count: columns.length,
    paneAt: (col) => columns[col]?.pane,
    widthAt: (col) => columns[col]?.width ?? 0,
    textAt,
    alignAt: (col) => (col === origin ? NuiTableAlign.Start : undefined),
    needAt: () => flood.need,
  };
};

export const floodWidthOf = (
  line: TableFloodLine,
  spills: ReadonlyMap<number, TableSpill>,
): number => sumBy([...spills.keys()], line.widthAt);
