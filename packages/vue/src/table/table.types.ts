import type { NuiPaginationProps } from '../pagination/pagination.types';
import type { NuiOptionKey } from '../shared/options';
import type { NuiSize } from '../shared/types';
import type { CheckState } from '../tree/cascade';

export type NuiTableAlign = 'start' | 'center' | 'end';
export type NuiSortDirection = 'asc' | 'desc';
export type NuiTableSort = { readonly key: string; readonly direction: NuiSortDirection } | null;
export type NuiTableSelection = 'single' | 'multiple';
export type NuiTablePagination = Partial<Omit<NuiPaginationProps, 'total' | 'size'>>;

export interface NuiTableColumn<T> {
  readonly key: string;
  readonly label: string;
  readonly sortable?: boolean | undefined;
  readonly align?: NuiTableAlign | undefined;
  readonly width?: string | undefined;
  readonly value?: ((row: T) => unknown) | undefined;
  readonly sort?: ((a: T, b: T) => number) | undefined;
}

export interface NuiTableProps<T> {
  columns: readonly NuiTableColumn<T>[];
  rows: readonly T[];
  getKey?: NuiOptionKey<T> | undefined;
  selectable?: NuiTableSelection | undefined;
  pagination?: NuiTablePagination | boolean | undefined;
  remote?: boolean | undefined;
  total?: number | undefined;
  loading?: boolean | undefined;
  loadingRows?: number | undefined;
  emptyLabel?: string | undefined;
  caption?: string | undefined;
  stickyHeader?: boolean | undefined;
  striped?: boolean | undefined;
  hoverable?: boolean | undefined;
  size?: NuiSize | undefined;
  virtual?: boolean | undefined;
  height?: string | undefined;
  rowHeight?: number | undefined;
  selectLabel?: string | undefined;
  selectAllLabel?: string | undefined;
}

export interface NuiTableCellSlot<T> {
  readonly row: T;
  readonly value: unknown;
  readonly column: NuiTableColumn<T>;
  readonly index: number;
}

export interface NuiTableHeaderSlot<T> {
  readonly column: NuiTableColumn<T>;
  readonly sort: NuiSortDirection | undefined;
}

export interface NuiTableSpacers {
  readonly start: number;
  readonly end: number;
}

export interface NuiTableHeadProps<T> {
  columns: readonly NuiTableColumn<T>[];
  sort: NuiTableSort;
  selectable: NuiTableSelection | undefined;
  selectionState: CheckState;
  selectionDisabled: boolean;
  selectAllLabel: string;
}

export interface NuiTableBodyProps<T> {
  columns: readonly NuiTableColumn<T>[];
  rows: readonly T[];
  keyOf: NuiOptionKey<T>;
  selectable: NuiTableSelection | undefined;
  selectedKeys: ReadonlySet<string>;
  loading: boolean;
  loadingRows: number;
  emptyLabel: string;
  selectLabel: string;
  firstIndex: number;
  spacers: NuiTableSpacers | undefined;
}

export interface NuiTableStatusProps<T> {
  span: number;
  loading: boolean;
  loadingRows: number;
  columns: readonly NuiTableColumn<T>[];
  selectable: NuiTableSelection | undefined;
  emptyLabel: string;
}

export interface NuiTableRowProps<T> {
  row: T;
  index: number;
  rowIndex: number | undefined;
  columns: readonly NuiTableColumn<T>[];
  selectable: NuiTableSelection | undefined;
  selected: boolean;
  selectLabel: string;
}
