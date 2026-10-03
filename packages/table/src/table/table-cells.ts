import { getCurrentInstance } from 'vue';
import type {
  NuiTableCellStyle,
  NuiTableCellStyler,
  NuiTableColumn,
  NuiTableEdgeDirection,
  NuiTableNextEdge,
  NuiTableRowHeaders,
  TableCellPosition,
} from './table.types';

export interface NuiTableSourceCell {
  readonly text: string;
  readonly style?: NuiTableCellStyle | undefined;
}

export interface NuiTableCellSource {
  readonly rows: number;
  readonly cols: number;
  cellAt(row: number, col: number): NuiTableSourceCell | undefined;
  nextEdge?(from: TableCellPosition, direction: NuiTableEdgeDirection): TableCellPosition;
  columnWidth?(col: number): number | undefined;
}

export interface NuiTableCells {
  readonly rows: readonly number[];
  readonly columns: readonly NuiTableColumn<number>[];
  readonly getKey: (row: number) => number;
  readonly cellStyle: NuiTableCellStyler<number>;
  readonly nextEdge: NuiTableNextEdge;
  readonly rowHeaders: NuiTableRowHeaders<number>;
}

type CellRead = (row: number, col: number) => NuiTableSourceCell | undefined;

const LETTERS = 26;
const CODE_A = 65;
const COLUMN_WIDTH = 96;

export const columnName = (col: number): string => {
  let rest = Math.max(0, Math.floor(col)) + 1;
  let name = '';

  while (rest > 0) {
    const letter = (rest - 1) % LETTERS;

    name = String.fromCodePoint(CODE_A + letter) + name;
    rest = Math.floor((rest - 1) / LETTERS);
  }
  return name;
};

export const columnIndex = (name: string): number =>
  [...name.toUpperCase()].reduce(
    (sum, letter) => sum * LETTERS + letter.charCodeAt(0) - CODE_A + 1,
    0,
  ) - 1;

const STEPS: Readonly<Record<NuiTableEdgeDirection, TableCellPosition>> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  previous: { row: 0, col: -1 },
  next: { row: 0, col: 1 },
};

interface EdgeWalk {
  readonly read: CellRead;
  readonly rows: number;
  readonly cols: number;
  readonly step: TableCellPosition;
}

const inside = (walk: EdgeWalk, at: TableCellPosition): boolean =>
  at.row >= 0 && at.row < walk.rows && at.col >= 0 && at.col < walk.cols;

const filled = (walk: EdgeWalk, at: TableCellPosition): boolean =>
  inside(walk, at) && (walk.read(at.row, at.col)?.text ?? '') !== '';

const ahead = (walk: EdgeWalk, at: TableCellPosition): TableCellPosition => ({
  row: at.row + walk.step.row,
  col: at.col + walk.step.col,
});

const blockEnd = (walk: EdgeWalk, from: TableCellPosition): TableCellPosition => {
  let at = from;

  while (filled(walk, ahead(walk, at))) {
    at = ahead(walk, at);
  }
  return at;
};

const nextFilled = (walk: EdgeWalk, from: TableCellPosition): TableCellPosition => {
  let at = from;

  while (inside(walk, ahead(walk, at))) {
    at = ahead(walk, at);

    if (filled(walk, at)) {
      return at;
    }
  }
  return at;
};

export const cellEdge = (
  read: CellRead,
  size: { readonly rows: number; readonly cols: number },
  from: TableCellPosition,
  direction: NuiTableEdgeDirection,
): TableCellPosition => {
  const walk: EdgeWalk = { read, rows: size.rows, cols: size.cols, step: STEPS[direction] };

  return filled(walk, from) && filled(walk, ahead(walk, from))
    ? blockEnd(walk, from)
    : nextFilled(walk, from);
};

const oncePerRender = (read: CellRead, cols: number): CellRead => {
  const seen = new Map<number, NuiTableSourceCell | undefined>();
  let queued = false;

  const forget = (): void => {
    seen.clear();
    queued = false;
  };

  return (row, col) => {
    if (getCurrentInstance() === null) {
      return read(row, col);
    }
    const key = row * cols + col;

    if (seen.has(key)) {
      return seen.get(key);
    }
    const cell = read(row, col);

    seen.set(key, cell);

    if (!queued) {
      queued = true;
      queueMicrotask(forget);
    }
    return cell;
  };
};

export const tableCells = (source: NuiTableCellSource): NuiTableCells => {
  const read = oncePerRender((row, col) => source.cellAt(row, col), source.cols);
  const indexOf = new Map<string, number>();

  const columns = Array.from({ length: source.cols }, (_, col): NuiTableColumn<number> => {
    const key = columnName(col);

    indexOf.set(key, col);

    return {
      key,
      label: key,
      type: 'text',
      width: source.columnWidth?.(col) ?? COLUMN_WIDTH,
      sortable: false,
      filter: false,
      hideable: false,
      reorderable: false,
      value: (row) => read(row, col)?.text ?? '',
    };
  });

  return {
    rows: Array.from({ length: source.rows }, (_, row) => row),
    columns,
    getKey: (row) => row,
    cellStyle: ({ row, column }) => {
      const col = indexOf.get(column.key);

      return col === undefined ? undefined : read(row, col)?.style;
    },
    nextEdge: (from, direction) =>
      source.nextEdge?.(from, direction) ??
      cellEdge((row, col) => source.cellAt(row, col), source, from, direction),
    rowHeaders: { label: (row) => String(row + 1) },
  };
};
