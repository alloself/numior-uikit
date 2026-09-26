import type { ComputedRef } from 'vue';
import type { NuiPaginationProps } from '../pagination/pagination.types';
import type { NuiOptionKey } from '../shared/options';
import type { NuiSize } from '../shared/scale.types';
import type { CheckState } from '../tree/cascade';
import type { NuiTableRowView } from './rows';

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
  headPointerdown(): void;
  headClick(event: MouseEvent): void;
}

export interface NuiTableReorderEvent<T> {
  readonly row: T;
  readonly from: number;
  readonly to: number;
  readonly parent: T | undefined;
}

export interface NuiTableProps<T> {
  columns: readonly NuiTableColumn<T>[];
  rows: readonly T[];
  getKey?: NuiOptionKey<T> | undefined;
  getChildren?: ((row: T) => readonly T[] | undefined) | undefined;
  isExpandable?: ((row: T) => boolean) | undefined;
  pinnedRows?: readonly T[] | undefined;
  rowDrag?: boolean | undefined;
  indent?: number | undefined;
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
  expandLabel?: ((row: T) => string) | undefined;
  dragLabel?: ((row: T) => string) | undefined;
  rowLabel?: ((row: T) => string) | undefined;
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

export type NuiTableSlots<T> = {
  caption?: () => unknown;
  loading?: () => unknown;
  empty?: () => unknown;
} & {
  [name: `cell-${string}`]: ((scope: NuiTableCellSlot<T>) => unknown) | undefined;
} & {
  [name: `header-${string}`]: ((scope: NuiTableHeaderSlot<T>) => unknown) | undefined;
};

export type NuiTableAxis = 'column' | 'row';

export interface NuiTableGhostView {
  readonly axis: NuiTableAxis;
  readonly label: string;
  readonly style: Readonly<Record<string, string>>;
}

export interface NuiTableDropView {
  readonly axis: NuiTableAxis;
  readonly style: Readonly<Record<string, string>>;
}

export interface NuiTableDragView {
  readonly ghost: ComputedRef<NuiTableGhostView | undefined>;
  readonly drops: ComputedRef<readonly NuiTableDropView[]>;
}

export interface NuiTableDragLayerProps {
  layer: NuiTableDragView;
}

export interface NuiTableSpacers {
  readonly start: number;
  readonly end: number;
}

export interface NuiTableHeadProps<T> {
  columns: readonly NuiTableColumn<T>[];
  sort: NuiTableSort;
  rowDrag: boolean;
  selectable: NuiTableSelection | undefined;
  selectionState: CheckState;
  selectionDisabled: boolean;
  selectAllLabel: string;
  layout: NuiTableCellLayout<T>;
  actions: NuiTableHeadActions<T>;
  resizing: string | undefined;
  dragging: number | undefined;
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

export interface NuiTableRowOptions<T> {
  readonly tree: boolean;
  readonly rowDrag: boolean;
  readonly dragDisabled: boolean;
  readonly selectLabel: string;
  readonly expandLabel: (row: T) => string;
  readonly dragLabel: (row: T) => string;
}

export interface NuiTableBodyProps<T> {
  columns: readonly NuiTableColumn<T>[];
  rows: readonly NuiTableRowView<T>[];
  layout: NuiTableCellLayout<T>;
  options: NuiTableRowOptions<T>;
  selectable: NuiTableSelection | undefined;
  selectedKeys: ReadonlySet<string>;
  loading: boolean;
  loadingRows: number;
  emptyLabel: string;
  firstIndex: number;
  spacers: NuiTableSpacers | undefined;
  dragging: number | undefined;
  pinned: boolean;
}

export interface NuiTableStatusProps<T> {
  span: number;
  loading: boolean;
  loadingRows: number;
  columns: readonly NuiTableColumn<T>[];
  emptyLabel: string;
}

export interface NuiTableRowProps<T> {
  view: NuiTableRowView<T>;
  index: number;
  rowIndex: number | undefined;
  columns: readonly NuiTableColumn<T>[];
  layout: NuiTableCellLayout<T>;
  options: NuiTableRowOptions<T>;
  selectable: NuiTableSelection | undefined;
  selected: boolean;
  dragging: boolean;
}
