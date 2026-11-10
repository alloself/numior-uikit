import { columnName } from '@numior/primitives/address';
import { getCurrentInstance } from 'vue';
import type {
  NuiTableCellStyle,
  NuiTableCellStyler,
  NuiTableRange,
  NuiTableColumn,
  NuiTableEdgeDirection,
  NuiTableLastCell,
  NuiTableNextEdge,
  NuiTableRowHeaders,
  NuiTableCellPosition,
} from './table.types';

export interface NuiTableSourceCell {
  readonly text: string;
  readonly style?: NuiTableCellStyle | undefined;
}

export interface NuiTableCellSource {
  readonly rows: number;
  readonly cols: number;
  cellAt(row: number, col: number): NuiTableSourceCell | undefined;
  nextEdge?(from: NuiTableCellPosition, direction: NuiTableEdgeDirection): NuiTableCellPosition;
  lastCell?(): NuiTableCellPosition | undefined;
  columnWidth?(col: number): number | undefined;
  rowLabel?(row: number): string;
  columnLabel?(col: number): string;
}

export interface NuiTableCells {
  readonly cellSelection: true;
  readonly rows: readonly number[];
  readonly columns: readonly NuiTableColumn<number>[];
  readonly getKey: (row: number) => number;
  readonly cellStyle: NuiTableCellStyler<number>;
  readonly nextEdge: NuiTableNextEdge;
  readonly lastCell: NuiTableLastCell;
  readonly rowHeaders: NuiTableRowHeaders<number>;
}

type CellRead = (row: number, col: number) => NuiTableSourceCell | undefined;

interface ReadCache {
  readonly read: CellRead;
  readonly forget: () => void;
}

interface EdgeWalk {
  readonly read: CellRead;
  readonly rows: number;
  readonly cols: number;
  readonly step: NuiTableCellPosition;
}

const COLUMN_WIDTH = 96;

export const cellName = (position: NuiTableCellPosition): string =>
  `${columnName(position.col)}${position.row + 1}`;

export const rangeName = (range: NuiTableRange): string => {
  const start = cellName({
    row: Math.min(range.from.row, range.to.row),
    col: Math.min(range.from.col, range.to.col),
  });

  const end = cellName({
    row: Math.max(range.from.row, range.to.row),
    col: Math.max(range.from.col, range.to.col),
  });

  return start === end ? start : `${start}:${end}`;
};

const STEPS: Readonly<Record<NuiTableEdgeDirection, NuiTableCellPosition>> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  previous: { row: 0, col: -1 },
  next: { row: 0, col: 1 },
};

const inside = (walk: EdgeWalk, at: NuiTableCellPosition): boolean =>
  at.row >= 0 && at.row < walk.rows && at.col >= 0 && at.col < walk.cols;

const filled = (walk: EdgeWalk, at: NuiTableCellPosition): boolean =>
  inside(walk, at) && (walk.read(at.row, at.col)?.text ?? '') !== '';

const ahead = (walk: EdgeWalk, at: NuiTableCellPosition): NuiTableCellPosition => ({
  row: at.row + walk.step.row,
  col: at.col + walk.step.col,
});

const blockEnd = (walk: EdgeWalk, from: NuiTableCellPosition): NuiTableCellPosition => {
  let at = from;

  while (filled(walk, ahead(walk, at))) {
    at = ahead(walk, at);
  }
  return at;
};

const nextFilled = (walk: EdgeWalk, from: NuiTableCellPosition): NuiTableCellPosition => {
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
  from: NuiTableCellPosition,
  direction: NuiTableEdgeDirection,
): NuiTableCellPosition => {
  const walk: EdgeWalk = { read, rows: size.rows, cols: size.cols, step: STEPS[direction] };

  return filled(walk, from) && filled(walk, ahead(walk, from))
    ? blockEnd(walk, from)
    : nextFilled(walk, from);
};

let numbered: readonly number[] = [];

const lineNumbers = (count: number): readonly number[] => {
  if (numbered.length !== count) {
    numbered = Array.from({ length: count }, (_, row) => row);
  }
  return numbered;
};

const forgetters = new WeakMap<object, () => void>();

export const forgetCellReads = (nextEdge: NuiTableNextEdge | undefined): void => {
  if (nextEdge !== undefined) {
    forgetters.get(nextEdge)?.();
  }
};

const oncePerRender = (read: CellRead, cols: number): ReadCache => {
  const seen = new Map<number, NuiTableSourceCell | undefined>();
  let queued = false;

  const forget = (): void => {
    seen.clear();
    queued = false;
  };

  return {
    forget,
    read: (row, col) => {
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
    },
  };
};

export const tableCells = (source: NuiTableCellSource): NuiTableCells => {
  const { read, forget } = oncePerRender((row, col) => source.cellAt(row, col), source.cols);
  const indexOf = new Map<string, number>();

  const columns = Array.from({ length: source.cols }, (_, col): NuiTableColumn<number> => {
    const key = columnName(col);

    indexOf.set(key, col);

    return {
      key,
      label: source.columnLabel?.(col) ?? key,
      type: 'text',
      width: source.columnWidth?.(col) ?? COLUMN_WIDTH,
      sortable: false,
      filter: false,
      hideable: false,
      reorderable: false,
      value: (row) => read(row, col)?.text ?? '',
    };
  });

  const nextEdge: NuiTableNextEdge = (from, direction) =>
    source.nextEdge?.(from, direction) ??
    cellEdge((row, col) => source.cellAt(row, col), source, from, direction);

  forgetters.set(nextEdge, forget);

  return {
    cellSelection: true,
    get rows() {
      return lineNumbers(source.rows);
    },
    columns,
    getKey: (row) => row,
    cellStyle: ({ row, column }) => {
      const col = indexOf.get(column.key);

      return col === undefined ? undefined : read(row, col)?.style;
    },
    nextEdge,
    lastCell: () => source.lastCell?.(),
    rowHeaders: { label: (row) => source.rowLabel?.(row) ?? String(row + 1) },
  };
};
