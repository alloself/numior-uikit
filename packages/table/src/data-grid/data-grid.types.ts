import type { NuiPaginationProps } from '@numior/vue';
import type {
  GridAggregate,
  GridAggregateFn,
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

export type NuiTableSelection = 'single' | 'multiple';

export type NuiTablePagination = Partial<Omit<NuiPaginationProps, 'total' | 'size'>>;

export type GridColumnKind = 'data' | 'select';

export interface GridPageWindow {
  readonly start: number;
  readonly end: number;
}

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
  readonly hideable?: boolean | undefined;
  readonly wrap?: boolean | undefined;
}

export interface NuiGridTextColumn<T> extends NuiGridColumnBase {
  readonly type: 'text';
  readonly value: (row: T) => string | null | undefined;
  readonly format?: ((value: string, row: T | undefined) => string) | undefined;
  readonly aggregate?: 'count' | GridAggregateFn<T> | undefined;
}

export interface NuiGridNumberColumn<T> extends NuiGridColumnBase {
  readonly type: 'number';
  readonly value: (row: T) => number | null | undefined;
  readonly format?: ((value: number, row: T | undefined) => string) | undefined;
  readonly aggregate?: GridAggregate<T> | undefined;
}

export interface NuiGridDateColumn<T> extends NuiGridColumnBase {
  readonly type: 'date';
  readonly value: (row: T) => Date | number | null | undefined;
  readonly format?: ((value: Date, row: T | undefined) => string) | undefined;
  readonly aggregate?: 'min' | 'max' | 'count' | GridAggregateFn<T> | undefined;
}

export interface NuiGridBooleanColumn<T> extends NuiGridColumnBase {
  readonly type: 'boolean';
  readonly value: (row: T) => boolean | null | undefined;
  readonly format?: ((value: boolean, row: T | undefined) => string) | undefined;
  readonly aggregate?: 'count' | GridAggregateFn<T> | undefined;
}

export type NuiGridColumn<T> =
  | NuiGridTextColumn<T>
  | NuiGridNumberColumn<T>
  | NuiGridDateColumn<T>
  | NuiGridBooleanColumn<T>;

export interface NuiGridColumnGroup<T> {
  readonly key: string;
  readonly label: string;
  readonly children: readonly NuiGridColumnDef<T>[];
}

export type NuiGridColumnDef<T> = NuiGridColumn<T> | NuiGridColumnGroup<T>;

export type NuiGridCellValue = string | number | Date | boolean | null;

export interface NuiDataGridProps<T> {
  columns: readonly NuiGridColumnDef<T>[];
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
  getChildren?: ((row: T) => readonly T[] | null | undefined) | undefined;
  hasChildren?: ((row: T) => boolean) | undefined;
  treeColumn?: string | undefined;
  columnMenu?: boolean | undefined;
  selectable?: NuiTableSelection | undefined;
  striped?: boolean | undefined;
  caption?: string | undefined;
  loading?: boolean | undefined;
  loadingRows?: number | undefined;
  selectLabel?: string | undefined;
  selectAllLabel?: string | undefined;
  pagination?: NuiTablePagination | boolean | undefined;
  remote?: boolean | undefined;
  total?: number | undefined;
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
  readonly count: number | undefined;
}

export interface NuiDataGridFooterCellProps {
  text: string;
  countText?: string | undefined;
}

export interface NuiDataGridHeaderSlot<T> {
  readonly column: NuiGridColumn<T>;
  readonly direction: GridSortDirection | undefined;
}

export interface NuiDataGridSettled {
  readonly rows: number;
}

export interface NuiDataGridEvents<T> {
  progress: [progress: GridProgress];
  settle: [result: NuiDataGridSettled];
  load: [row: T];
  rowClick: [row: T, event: MouseEvent];
}

export type NuiDataGridSort = readonly GridSort[];

export type NuiDataGridFilters = readonly NuiGridColumnFilter[];

export type NuiDataGridGroupBy = readonly string[];

export type NuiDataGridExpanded = readonly GridNodeId[];

export type NuiDataGridPins = Readonly<Record<string, NuiGridPin | null>>;

export type NuiDataGridHidden = readonly string[];

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
  loading?: () => unknown;
  caption?: () => unknown;
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
  readonly kind: GridColumnKind;
  readonly colIndex: number;
  readonly align: NuiGridAlign;
  readonly wrap?: boolean | undefined;
  readonly style: Readonly<Record<string, string>>;
  readonly span?: number | undefined;
}

export interface GridPanes {
  readonly start: readonly GridCellLayout[];
  readonly centre: readonly GridCellLayout[];
  readonly end: readonly GridCellLayout[];
  readonly centreInset: number;
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
  menuLabel?: string | undefined;
  menuExpanded: 'true' | 'false';
}

export interface GridCellPosition {
  readonly row: number;
  readonly col: number;
}

export type GridHeaderTarget =
  | { readonly kind: 'column'; readonly key: string }
  | { readonly kind: 'slot'; readonly index: number };

export type GridRowPart = 'band' | 'head' | 'body' | 'foot' | 'skeleton';

export type GridStatusSlot = 'empty' | 'loading';

export interface GridSkeletonRow {
  readonly index: number;
  readonly offset: number | undefined;
  readonly key: string;
}

export interface GridBodyRow {
  readonly index: number;
  readonly offset: number | undefined;
  readonly key: GridNodeId;
  readonly revision: number;
  readonly level: number | undefined;
  readonly treeLevel: number;
  readonly group: GridGroupRow | undefined;
  readonly expanded: boolean | undefined;
  readonly loading: boolean;
  readonly selected: boolean | undefined;
  readonly stripe: boolean;
}

export interface NuiDataGridUtilityCellProps {
  control: 'checkbox' | 'skeleton' | 'none';
  checked?: boolean | undefined;
  indeterminate?: boolean | undefined;
  disabled?: boolean | undefined;
  label?: string | undefined;
}

export type GridGroupCell =
  | { readonly kind: 'toggle'; readonly text: string; readonly count: string }
  | { readonly kind: 'value'; readonly text: string };

export interface GridGroupRow {
  readonly id: string;
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
  treeKey?: string | undefined;
  expanded?: boolean | undefined;
  loading?: boolean | undefined;
  selected?: boolean | undefined;
  stripe?: boolean | undefined;
  heads?: Readonly<Record<string, GridHeadState>> | undefined;
}

export interface NuiDataGridTreeToggleProps {
  level: number;
  expandable: boolean;
  loading: boolean;
}

export interface NuiDataGridGroupCellProps {
  cell: GridGroupCell | undefined;
}
