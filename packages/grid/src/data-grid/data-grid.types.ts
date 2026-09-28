import type {
  GridDistinct,
  GridFilter,
  GridFilterValue,
  GridNodeId,
  GridProgress,
  GridSort,
  GridSortDirection,
} from '../engine';

export type NuiDataGridSize = 'sm' | 'md' | 'lg';

export type NuiGridAlign = 'start' | 'center' | 'end';

export type NuiGridPin = 'start' | 'end';

export type NuiGridFilterKind = 'text' | 'number' | 'date' | 'set';

export type NuiGridColumnFilter = Exclude<GridFilter, { kind: 'quick' }>;

interface NuiGridColumnBase {
  readonly key: string;
  readonly label: string;
  readonly width?: number | undefined;
  readonly minWidth?: number | undefined;
  readonly pin?: NuiGridPin | undefined;
  readonly align?: NuiGridAlign | undefined;
  readonly sortable?: boolean | undefined;
  readonly filter?: NuiGridFilterKind | false | undefined;
}

export interface NuiGridTextColumn<T> extends NuiGridColumnBase {
  readonly type: 'text';
  readonly value: (row: T) => string | null | undefined;
  readonly format?: ((value: string, row: T | undefined) => string) | undefined;
}

export interface NuiGridNumberColumn<T> extends NuiGridColumnBase {
  readonly type: 'number';
  readonly value: (row: T) => number | null | undefined;
  readonly format?: ((value: number, row: T | undefined) => string) | undefined;
}

export interface NuiGridDateColumn<T> extends NuiGridColumnBase {
  readonly type: 'date';
  readonly value: (row: T) => Date | number | null | undefined;
  readonly format?: ((value: Date, row: T | undefined) => string) | undefined;
}

export interface NuiGridBooleanColumn<T> extends NuiGridColumnBase {
  readonly type: 'boolean';
  readonly value: (row: T) => boolean | null | undefined;
  readonly format?: ((value: boolean, row: T | undefined) => string) | undefined;
}

export type NuiGridColumn<T> =
  | NuiGridTextColumn<T>
  | NuiGridNumberColumn<T>
  | NuiGridDateColumn<T>
  | NuiGridBooleanColumn<T>;

export type NuiGridCellValue = string | number | Date | boolean | null;

export interface NuiDataGridProps<T> {
  columns: readonly NuiGridColumn<T>[];
  source: readonly T[];
  getKey?: ((row: T) => GridNodeId) | undefined;
  id?: string | undefined;
  size?: NuiDataGridSize | undefined;
  rowHeight?: number | undefined;
  height?: string | undefined;
  locale?: string | undefined;
  label?: string | undefined;
  emptyLabel?: string | undefined;
}

export interface NuiDataGridCellSlot<T> {
  readonly row: T;
  readonly value: NuiGridCellValue;
  readonly text: string;
  readonly column: NuiGridColumn<T>;
  readonly position: number;
}

export interface NuiDataGridHeaderSlot<T> {
  readonly column: NuiGridColumn<T>;
  readonly direction: GridSortDirection | undefined;
}

export interface NuiDataGridSettled {
  readonly rows: number;
}

export interface NuiDataGridEvents {
  progress: [progress: GridProgress];
  settle: [result: NuiDataGridSettled];
}

export type NuiDataGridSort = readonly GridSort[];

export type NuiDataGridFilters = readonly NuiGridColumnFilter[];

export interface NuiDataGridFilterProps {
  title: string;
  kind: NuiGridFilterKind;
  columnKey: string;
  filter: NuiGridColumnFilter | undefined;
  anchor: HTMLElement | null;
  locale: string;
  loadValues: () => Promise<GridDistinct | null>;
  valueLabel: (value: GridFilterValue) => string;
}

export type NuiDataGridSlots<T> = {
  empty?: () => unknown;
} & {
  [name: `cell-${string}`]: ((scope: NuiDataGridCellSlot<T>) => unknown) | undefined;
} & {
  [name: `header-${string}`]: ((scope: NuiDataGridHeaderSlot<T>) => unknown) | undefined;
};

export interface NuiDataGridExposed {
  scrollToRow(position: number): void;
  scrollToColumn(key: string): void;
}

export type GridPaneName = 'start' | 'centre' | 'end';

export interface GridCellLayout {
  readonly key: string;
  readonly colIndex: number;
  readonly align: NuiGridAlign;
  readonly style: Readonly<Record<string, string>>;
}

export interface GridPanes {
  readonly start: readonly GridCellLayout[];
  readonly centre: readonly GridCellLayout[];
  readonly end: readonly GridCellLayout[];
}

export interface GridHeadState {
  readonly sortable: boolean;
  readonly direction: GridSortDirection | undefined;
  readonly order: number | undefined;
  readonly primary: boolean;
  readonly filterable: boolean;
  readonly filtered: boolean;
}

export interface NuiDataGridHeaderMarksProps {
  state: GridHeadState | undefined;
  hint: string;
  filterLabel: string;
  expanded: 'true' | 'false';
}

export interface GridCellPosition {
  readonly row: number;
  readonly col: number;
}

export interface NuiDataGridRowProps {
  panes: GridPanes;
  rowIndex: number;
  head?: boolean | undefined;
  offset?: number | undefined;
  active?: number | undefined;
  revision?: number | undefined;
  heads?: Readonly<Record<string, GridHeadState>> | undefined;
}
