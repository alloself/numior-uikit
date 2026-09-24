import type { NuiPaginationProps } from '../pagination/pagination.types';
import type { NuiOptionKey } from '../shared/options';
import type { NuiSize } from '../shared/types';
import type { CheckState } from '../tree/cascade';

export type NuiTableAlign = 'start' | 'center' | 'end';
export type NuiSortDirection = 'asc' | 'desc';
export type NuiTableSort = { readonly key: string; readonly direction: NuiSortDirection } | null;
export type NuiTableSelection = 'single' | 'multiple';
export type NuiTablePagination = Partial<Omit<NuiPaginationProps, 'total' | 'size'>>;

export type NuiTableSticky = 'start' | 'end';

export interface NuiTableColumn<T> {
  readonly key: string;
  readonly label: string;
  readonly sortable?: boolean | undefined;
  readonly align?: NuiTableAlign | undefined;
  readonly width?: number | string | undefined;
  readonly minWidth?: number | undefined;
  readonly maxWidth?: number | undefined;
  readonly resizable?: boolean | undefined;
  readonly reorderable?: boolean | undefined;
  readonly sticky?: NuiTableSticky | undefined;
  readonly value?: ((row: T) => unknown) | undefined;
  readonly sort?: ((a: T, b: T) => number) | undefined;
}

export type NuiTableAnnouncePhase = 'grabbed' | 'moved' | 'dropped' | 'cancelled';

export interface NuiTableAnnouncement {
  readonly kind: 'column' | 'row';
  readonly phase: NuiTableAnnouncePhase;
  readonly label: string;
  readonly from: number;
  readonly to: number;
  readonly count: number;
}

export type NuiTableCellStyle = Record<string, string> | undefined;

export interface NuiTableCellLayout<T> {
  widthOf(column: NuiTableColumn<T>): number | undefined;
  cellStyle(column: NuiTableColumn<T>): NuiTableCellStyle;
  cellClass(column: NuiTableColumn<T>): string[];
  utilityStyle(position: number): NuiTableCellStyle;
  utilityClass(position: number): string[];
}

export interface NuiTableHeadActions<T> {
  resizeStart(column: NuiTableColumn<T>, event: PointerEvent): void;
  resizeKeydown(column: NuiTableColumn<T>, event: KeyboardEvent): void;
  resizeReset(column: NuiTableColumn<T>): void;
  dragStart(index: number, event: PointerEvent): void;
  dragKeydown(index: number, event: KeyboardEvent): void;
  headClick(event: MouseEvent): void;
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
  resizeLabel?: ((column: NuiTableColumn<T>) => string) | undefined;
  reorderLabel?: ((column: NuiTableColumn<T>) => string) | undefined;
  announce?: ((announcement: NuiTableAnnouncement) => string) | undefined;
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
  layout: NuiTableCellLayout<T>;
  actions: NuiTableHeadActions<T>;
  resizing: string | undefined;
  dragging: number;
  resizeLabel: (column: NuiTableColumn<T>) => string;
  reorderLabel: (column: NuiTableColumn<T>) => string;
}

export interface NuiTableHeadCellProps<T> {
  column: NuiTableColumn<T>;
  index: number;
  sort: NuiTableSort;
  layout: NuiTableCellLayout<T>;
  actions: NuiTableHeadActions<T>;
  resizing: boolean;
  dragging: boolean;
  resizeLabel: (column: NuiTableColumn<T>) => string;
  reorderLabel: (column: NuiTableColumn<T>) => string;
}

export interface NuiTableBodyProps<T> {
  columns: readonly NuiTableColumn<T>[];
  rows: readonly T[];
  keyOf: NuiOptionKey<T>;
  layout: NuiTableCellLayout<T>;
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
  layout: NuiTableCellLayout<T>;
  selectable: NuiTableSelection | undefined;
  selected: boolean;
  selectLabel: string;
}
