import type {
  GridAggregate,
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

interface NuiGridColumnCommon<T> extends NuiGridColumnBase {
  readonly aggregate?: GridAggregate<T> | undefined;
}

export interface NuiGridTextColumn<T> extends NuiGridColumnCommon<T> {
  readonly type: 'text';
  readonly value: (row: T) => string | null | undefined;
  readonly format?: ((value: string, row: T | undefined) => string) | undefined;
}

export interface NuiGridNumberColumn<T> extends NuiGridColumnCommon<T> {
  readonly type: 'number';
  readonly value: (row: T) => number | null | undefined;
  readonly format?: ((value: number, row: T | undefined) => string) | undefined;
}

export interface NuiGridDateColumn<T> extends NuiGridColumnCommon<T> {
  readonly type: 'date';
  readonly value: (row: T) => Date | number | null | undefined;
  readonly format?: ((value: Date, row: T | undefined) => string) | undefined;
}

export interface NuiGridBooleanColumn<T> extends NuiGridColumnCommon<T> {
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
  totalsLabel?: string | undefined;
}

export interface NuiDataGridCellSlot<T> {
  readonly row: T;
  readonly value: NuiGridCellValue;
  readonly text: string;
  readonly column: NuiGridColumn<T>;
  readonly position: number;
}

export interface NuiDataGridFooterSlot<T> {
  readonly column: NuiGridColumn<T>;
  readonly value: unknown;
  readonly text: string;
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

export type NuiDataGridGroupBy = readonly string[];

export type NuiDataGridExpanded = readonly GridNodeId[];

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
} & {
  [name: `footer-${string}`]: ((scope: NuiDataGridFooterSlot<T>) => unknown) | undefined;
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

export type GridRowPart = 'head' | 'body' | 'foot';

export type GridGroupCell =
  | { readonly kind: 'toggle'; readonly text: string; readonly count: string }
  | { readonly kind: 'value'; readonly text: string };

export interface GridGroupRow {
  readonly id: string;
  readonly expanded: boolean;
  readonly cells: Readonly<Record<string, GridGroupCell>>;
}

export interface NuiDataGridRowProps {
  panes: GridPanes;
  rowIndex: number;
  part?: GridRowPart | undefined;
  offset?: number | undefined;
  active?: number | undefined;
  revision?: number | undefined;
  level?: number | undefined;
  group?: GridGroupRow | undefined;
  heads?: Readonly<Record<string, GridHeadState>> | undefined;
}

export interface NuiDataGridGroupCellProps {
  cell: GridGroupCell | undefined;
}
