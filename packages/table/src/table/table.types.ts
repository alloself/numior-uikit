import type { NuiMenuEntry, NuiPaginationProps } from '@numior/vue';
import type {
  TableAggregate,
  TableAggregateFn,
  TableDistinct,
  TableFilter,
  TableFilterValue,
  TableNodeId,
  TableProgress,
  TableSort,
  TableSortDirection,
} from '../engine';

export type NuiTableSize = 'sm' | 'md' | 'lg';

export type NuiTableAlign = 'start' | 'center' | 'end';

export type NuiTablePin = 'start' | 'end';

export type NuiTableSelection = 'single' | 'multiple';

export type NuiTablePagination = Partial<Omit<NuiPaginationProps, 'total' | 'size'>>;

export type TableColumnKind = 'data' | 'select';

export interface TablePageWindow {
  readonly start: number;
  readonly end: number;
}

export type NuiTableFilterKind = 'text' | 'number' | 'date' | 'set';

export type NuiTableColumnFilter = Exclude<TableFilter, { kind: 'quick' }>;

interface NuiTableColumnBase {
  readonly key: string;
  readonly label: string;
  readonly width?: number | undefined;
  readonly minWidth?: number | undefined;
  readonly maxWidth?: number | undefined;
  readonly resizable?: boolean | undefined;
  readonly reorderable?: boolean | undefined;
  readonly pin?: NuiTablePin | undefined;
  readonly align?: NuiTableAlign | undefined;
  readonly sortable?: boolean | undefined;
  readonly filter?: NuiTableFilterKind | false | undefined;
  readonly hideable?: boolean | undefined;
  readonly wrap?: boolean | undefined;
  readonly flex?: number | undefined;
}

interface NuiTableColumnEditing<T> {
  readonly editable?: boolean | ((row: T) => boolean) | undefined;
}

export interface NuiTableTextColumn<T> extends NuiTableColumnBase, NuiTableColumnEditing<T> {
  readonly type: 'text';
  readonly value: (row: T) => string | null | undefined;
  readonly format?: ((value: string, row: T | undefined) => string) | undefined;
  readonly aggregate?: 'count' | TableAggregateFn<T> | undefined;
}

export interface NuiTableNumberColumn<T> extends NuiTableColumnBase, NuiTableColumnEditing<T> {
  readonly type: 'number';
  readonly value: (row: T) => number | null | undefined;
  readonly format?: ((value: number, row: T | undefined) => string) | undefined;
  readonly aggregate?: TableAggregate<T> | undefined;
}

export interface NuiTableDateColumn<T> extends NuiTableColumnBase, NuiTableColumnEditing<T> {
  readonly type: 'date';
  readonly value: (row: T) => Date | number | null | undefined;
  readonly format?: ((value: Date, row: T | undefined) => string) | undefined;
  readonly aggregate?: 'min' | 'max' | 'count' | TableAggregateFn<T> | undefined;
}

export interface NuiTableBooleanColumn<T> extends NuiTableColumnBase, NuiTableColumnEditing<T> {
  readonly type: 'boolean';
  readonly value: (row: T) => boolean | null | undefined;
  readonly format?: ((value: boolean, row: T | undefined) => string) | undefined;
  readonly aggregate?: 'count' | TableAggregateFn<T> | undefined;
}

export type NuiTableColumn<T> =
  | NuiTableTextColumn<T>
  | NuiTableNumberColumn<T>
  | NuiTableDateColumn<T>
  | NuiTableBooleanColumn<T>;

export interface NuiTableColumnGroup<T> {
  readonly key: string;
  readonly label: string;
  readonly children: readonly NuiTableColumnDef<T>[];
}

export type NuiTableColumnDef<T> = NuiTableColumn<T> | NuiTableColumnGroup<T>;

export type NuiTableCellValue = string | number | Date | boolean | null;

export interface NuiTableProps<T> {
  columns: readonly NuiTableColumnDef<T>[];
  rows: readonly T[];
  getKey?: ((row: T) => TableNodeId) | undefined;
  id?: string | undefined;
  size?: NuiTableSize | undefined;
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
  pinnedRows?: readonly T[] | undefined;
  rowDrag?: boolean | undefined;
  nestDelay?: number | undefined;
  dragLabel?: ((row: T) => string) | undefined;
  rowLabel?: ((row: T) => string) | undefined;
  cellSelection?: boolean | undefined;
  contextMenu?: NuiTableContextMenu<T> | false | undefined;
  copyLimit?: number | undefined;
}

export interface NuiTableReorderEvent<T> {
  readonly row: T;
  readonly from: number;
  readonly to: number;
  readonly parent: T | undefined;
  readonly toParent: T | undefined;
}

export interface NuiTableCellSlot<T> {
  readonly row: T;
  readonly value: NuiTableCellValue;
  readonly text: string;
  readonly column: NuiTableColumn<T>;
  readonly position: number;
  readonly pinned: boolean;
}

export interface NuiTableRange {
  readonly from: TableCellPosition;
  readonly to: TableCellPosition;
}

export type NuiTableRanges = readonly NuiTableRange[];

export interface NuiTableContextScope<T> extends NuiTableCellSlot<T> {
  readonly ranges: NuiTableRanges;
}

export type NuiTableContextMenu<T> = (scope: NuiTableContextScope<T>) => readonly NuiMenuEntry[];

export interface NuiTableCopyOptions {
  readonly headers?: boolean | undefined;
}

export type NuiTableEditKind = 'clear' | 'cut' | 'undo' | 'redo';

export interface NuiTableEdit<T> {
  readonly row: T;
  readonly key: string;
  readonly value: NuiTableCellValue;
  readonly previous: NuiTableCellValue;
}

export interface NuiTableEditEvent<T> {
  readonly kind: NuiTableEditKind;
  readonly changes: readonly NuiTableEdit<T>[];
}

export interface TableRangeSegment {
  readonly from: number;
  readonly to: number;
  readonly top: boolean;
  readonly bottom: boolean;
  readonly start: boolean;
  readonly end: boolean;
}

export type TableRowRanges = readonly TableRangeSegment[];

export interface TableCellContentProps<T> {
  readonly column: string;
  readonly position: number;
  readonly row?: T | undefined;
  readonly item?: TableBodyRow | undefined;
  readonly pinned?: boolean | undefined;
}

export interface TablePinnedRow<T> {
  readonly row: T;
  readonly index: number;
  readonly key: string | number;
  readonly selected: boolean | undefined;
}

export interface NuiTableFooterSlot<T> {
  readonly column: NuiTableColumn<T>;
  readonly value: unknown;
  readonly text: string;
  readonly count: number | undefined;
}

export interface NuiTableFooterCellProps {
  text: string;
  countText?: string | undefined;
}

export interface NuiTableHeaderSlot<T> {
  readonly column: NuiTableColumn<T>;
  readonly direction: TableSortDirection | undefined;
}

export interface NuiTableSettled {
  readonly rows: number;
}

export interface NuiTableEvents<T> {
  progress: [progress: TableProgress];
  settle: [result: NuiTableSettled];
  load: [row: T];
  rowClick: [row: T, event: MouseEvent];
  reorder: [event: NuiTableReorderEvent<T>];
  edit: [event: NuiTableEditEvent<T>];
}

export type NuiTableSort = readonly TableSort[];

export type NuiTableFilters = readonly NuiTableColumnFilter[];

export type NuiTableGroupBy = readonly string[];

export type NuiTableExpanded = readonly TableNodeId[];

export type NuiTablePins = Readonly<Record<string, NuiTablePin | null>>;

export type NuiTableHidden = readonly string[];

export type NuiTableWidths = Readonly<Record<string, number>>;

export type NuiTableColumnOrder = readonly string[];

export interface TableGhost {
  readonly start: number;
  readonly size: number;
  readonly label: string;
}

export interface TableDropInset {
  readonly start: number;
  readonly level: number;
}

export type TableDropMark =
  | { readonly kind: 'line'; readonly start: number; readonly inset?: TableDropInset | undefined }
  | { readonly kind: 'box'; readonly start: number; readonly size: number };

export type TableBandRule = 'start' | 'end' | 'both';

export interface NuiTableFilterProps {
  title: string;
  kind: NuiTableFilterKind;
  columnKey: string;
  filter: NuiTableColumnFilter | undefined;
  anchor: HTMLElement | null;
  locale: string;
  loadValues: () => Promise<TableDistinct | null>;
  valueLabel: (value: TableFilterValue) => string;
}

export type NuiTableSlots<T> = {
  empty?: () => unknown;
  loading?: () => unknown;
  caption?: () => unknown;
} & {
  [name: `cell-${string}`]: ((scope: NuiTableCellSlot<T>) => unknown) | undefined;
} & {
  [name: `header-${string}`]: ((scope: NuiTableHeaderSlot<T>) => unknown) | undefined;
} & {
  [name: `footer-${string}`]: ((scope: NuiTableFooterSlot<T>) => unknown) | undefined;
};

export interface NuiTableExposed {
  scrollToRow(position: number): void;
  scrollToColumn(key: string): void;
  copy(options?: NuiTableCopyOptions): Promise<boolean>;
  undo(): boolean;
  redo(): boolean;
}

export type TablePaneName = 'start' | 'centre' | 'end';

export interface TableDataCell {
  readonly kind: TableColumnKind;
  readonly key: string;
  readonly colIndex: number;
  readonly align: NuiTableAlign;
  readonly wrap: boolean;
  readonly pin: NuiTablePin | undefined;
  readonly edge: boolean;
  readonly style: Readonly<Record<string, string>> | undefined;
  readonly span: number | undefined;
  readonly colspan: number;
  readonly handle?: string | undefined;
  readonly rule?: TableBandRule | undefined;
}

export interface TableGapCell {
  readonly kind: 'gap';
  readonly key: string;
  readonly pin: NuiTablePin | undefined;
  readonly edge: boolean;
  readonly style: Readonly<Record<string, string>> | undefined;
  readonly colspan: number;
}

export type TableCellLayout = TableDataCell | TableGapCell;

export interface TableTrack {
  readonly key: string;
  readonly width: number | undefined;
}

export interface TableRowCells {
  readonly cells: readonly TableCellLayout[];
  readonly tracks: readonly TableTrack[];
}

export interface TableHeadState {
  readonly sortable: boolean;
  readonly direction: TableSortDirection | undefined;
  readonly order: number | undefined;
  readonly primary: boolean;
  readonly filterable: boolean;
  readonly filtered: boolean;
  readonly resizable: boolean;
  readonly resizing: boolean;
  readonly reorderable: boolean;
  readonly dragging: boolean;
}

export interface NuiTableHeaderMarksProps {
  state: TableHeadState | undefined;
  hint: string;
  filterLabel: string;
  expanded: 'true' | 'false';
  menuLabel?: string | undefined;
  menuExpanded: 'true' | 'false';
  grip?: NuiTableGripProps | undefined;
}

export interface NuiTableGripProps {
  active?: boolean | undefined;
}

export interface NuiTableDragLayerProps {
  axis?: 'x' | 'y' | undefined;
  drop?: TableDropMark | undefined;
  ghost?: TableGhost | undefined;
}

export interface NuiTableRowGripProps {
  label: string;
  disabled?: boolean | undefined;
  active?: boolean | undefined;
}

export interface TableCellPosition {
  readonly row: number;
  readonly col: number;
}

export type TableHeaderTarget =
  | { readonly kind: 'column'; readonly key: string }
  | { readonly kind: 'slot'; readonly index: number };

export type TableRowPart = 'band' | 'head' | 'pinned' | 'body' | 'foot' | 'skeleton';

export type TableStatusSlot = 'empty' | 'loading';

export interface TableSkeletonRow {
  readonly index: number;
  readonly key: string;
}

export interface TableBodyRow {
  readonly index: number;
  readonly top: number | undefined;
  readonly key: number;
  readonly revision: number;
  readonly level: number | undefined;
  readonly treeLevel: number;
  readonly group: TableGroupRow | undefined;
  readonly expanded: boolean | undefined;
  readonly loading: boolean;
  readonly selected: boolean | undefined;
  readonly stripe: boolean;
}

export interface NuiTableUtilityCellProps {
  control: 'checkbox' | 'skeleton' | 'none';
  checked?: boolean | undefined;
  indeterminate?: boolean | undefined;
  disabled?: boolean | undefined;
  label?: string | undefined;
}

export type TableGroupCell =
  | { readonly kind: 'toggle'; readonly text: string; readonly count: string }
  | { readonly kind: 'value'; readonly text: string };

export interface TableGroupRow {
  readonly id: string;
  readonly cells: Readonly<Record<string, TableGroupCell>>;
}

export interface NuiTableRowProps {
  cells: TableRowCells;
  rowIndex: number;
  part?: TableRowPart | undefined;
  top?: number | undefined;
  active?: number | undefined;
  revision?: number | undefined;
  level?: number | undefined;
  group?: TableGroupRow | undefined;
  expanded?: boolean | undefined;
  loading?: boolean | undefined;
  selected?: boolean | undefined;
  stripe?: boolean | undefined;
  dragging?: boolean | undefined;
  ranged?: TableRowRanges | undefined;
  heads?: Readonly<Record<string, TableHeadState>> | undefined;
}

export interface NuiTableTreeToggleProps {
  level: number;
  expandable: boolean;
  loading: boolean;
}

export interface NuiTableGroupCellProps {
  cell: TableGroupCell | undefined;
}

export interface NuiTableResizerProps {
  start?: boolean | undefined;
  active?: boolean | undefined;
}

export interface NuiTableTracksProps {
  tracks: readonly TableTrack[];
}
