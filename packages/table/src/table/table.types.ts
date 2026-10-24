import type { Component } from 'vue';
import type { FieldRule } from '@numior/forms';
import type { Guard, NuiControlRegistry } from '@numior/primitives';
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
  TableSource,
} from '../engine';

export type NuiTableSize = 'sm' | 'md' | 'lg';

export type NuiTableAlign = 'start' | 'center' | 'end';

export type NuiTablePin = 'start' | 'end';

export type NuiTableSelection = 'single' | 'multiple';

export type NuiTablePagination = Partial<Omit<NuiPaginationProps, 'total' | 'size'>>;

export type TableColumnKind = 'data' | 'select' | 'rowhead';

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

export interface NuiTableEditor<V> {
  readonly kind: 'component';
  readonly component: Component;
  readonly model: string;
  readonly accepts: Guard<V>;
  readonly props: Readonly<Record<string, unknown>>;
}

export interface NuiTableControlEditor {
  readonly control: string;
  readonly props?: Readonly<Record<string, unknown>> | undefined;
}

export type NuiTableColumnEditor<V> = NuiTableEditor<V> | NuiTableControlEditor | string;

interface NuiTableColumnEditing<T, V, E = V> {
  readonly editable?: boolean | ((row: T) => boolean) | undefined;
  readonly parse?: ((text: string, row: T) => V | null | undefined) | undefined;
  readonly rules?: readonly FieldRule<V | null, T>[] | undefined;
  readonly editor?: NuiTableColumnEditor<E> | undefined;
}

export interface NuiTableTextColumn<T>
  extends NuiTableColumnBase, NuiTableColumnEditing<T, string> {
  readonly type: 'text';
  readonly value: (row: T) => string | null | undefined;
  readonly format?: ((value: string, row: T | undefined) => string) | undefined;
  readonly aggregate?: 'count' | TableAggregateFn<T> | undefined;
}

export interface NuiTableNumberColumn<T>
  extends NuiTableColumnBase, NuiTableColumnEditing<T, number> {
  readonly type: 'number';
  readonly value: (row: T) => number | null | undefined;
  readonly format?: ((value: number, row: T | undefined) => string) | undefined;
  readonly aggregate?: TableAggregate<T> | undefined;
}

export interface NuiTableDateColumn<T>
  extends NuiTableColumnBase, NuiTableColumnEditing<T, Date | number, string> {
  readonly type: 'date';
  readonly value: (row: T) => Date | number | null | undefined;
  readonly format?: ((value: Date, row: T | undefined) => string) | undefined;
  readonly aggregate?: 'min' | 'max' | 'count' | TableAggregateFn<T> | undefined;
}

export interface NuiTableBooleanColumn<T>
  extends NuiTableColumnBase, NuiTableColumnEditing<T, boolean> {
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
  rows?: readonly T[] | undefined;
  source?: TableSource<T> | undefined;
  blockSize?: number | undefined;
  getKey?: ((row: T) => TableNodeId) | undefined;
  id?: string | undefined;
  size?: NuiTableSize | undefined;
  rowHeight?: number | 'auto' | undefined;
  height?: string | undefined;
  locale?: string | undefined;
  label?: string | undefined;
  emptyLabel?: string | undefined;
  totalsLabel?: string | undefined;
  getChildren?: ((row: T) => readonly T[] | null | undefined) | undefined;
  hasChildren?: ((row: T) => boolean) | undefined;
  hasDetail?: ((row: T) => boolean) | undefined;
  cellStyle?: NuiTableCellStyler<T> | undefined;
  merges?: readonly NuiTableRange[] | undefined;
  bordered?: boolean | undefined;
  rowHeaders?: NuiTableRowHeaders<T> | boolean | undefined;
  treeColumn?: string | undefined;
  columnMenu?: NuiTableColumnMenu<T> | boolean | undefined;
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
  frozenRows?: number | undefined;
  nextEdge?: NuiTableNextEdge | undefined;
  keepEditing?: ((target: Element) => boolean) | undefined;
  picking?: ((draft: NuiTableDraft) => boolean) | undefined;
  rowDrag?: boolean | undefined;
  nestDelay?: number | undefined;
  dragLabel?: ((row: T) => string) | undefined;
  rowLabel?: ((row: T) => string) | undefined;
  cellSelection?: boolean | undefined;
  contextMenu?: NuiTableContextMenu<T> | false | undefined;
  copyLimit?: number | undefined;
  clipboard?: NuiTableClipboard<T> | undefined;
  commands?: NuiTableCommandSink<T> | undefined;
  controls?: NuiControlRegistry | undefined;
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

export interface NuiTableRowHeaders<T> {
  readonly label?: ((row: T, position: number) => string) | undefined;
  readonly width?: number | undefined;
  readonly resizable?: boolean | undefined;
}

export type NuiTableRowHeights = Readonly<Record<string, number>>;

export interface NuiTableCellRef<T> {
  readonly row: T;
  readonly column: NuiTableColumn<T>;
  readonly position: number;
  readonly pinned: boolean;
}

export interface NuiTableCellBorders {
  readonly top?: string | undefined;
  readonly end?: string | undefined;
  readonly bottom?: string | undefined;
  readonly start?: string | undefined;
}

export interface NuiTableCellStyle {
  readonly class?: string | undefined;
  readonly fill?: string | undefined;
  readonly color?: string | undefined;
  readonly align?: NuiTableAlign | undefined;
  readonly wrap?: boolean | undefined;
  readonly overflow?: boolean | undefined;
  readonly borders?: NuiTableCellBorders | undefined;
  readonly style?: Readonly<Record<string, string>> | undefined;
}

export type NuiTableCellStyler<T> = (cell: NuiTableCellRef<T>) => NuiTableCellStyle | undefined;

export interface TableCellPaint {
  readonly class: readonly unknown[];
  readonly style: Readonly<Record<string, string>>;
  readonly align: NuiTableAlign | undefined;
  readonly overflow: boolean;
}

export type TableRowPaint = ReadonlyMap<string, TableCellPaint>;

export type TableRowPainter = (position: number, spans?: TableRowSpan) => TableRowPaint | undefined;

export type NuiTableEdgeDirection = 'up' | 'down' | 'previous' | 'next';

export interface NuiTableRect {
  readonly top: number;
  readonly start: number;
  readonly width: number;
  readonly height: number;
}

export interface NuiTableSpan {
  readonly start: number;
  readonly end: number;
}

export interface NuiTableWindow {
  readonly rows: NuiTableSpan;
  readonly cols: NuiTableSpan;
}

export interface NuiTableOverlaySlot {
  readonly rectOf: (range: NuiTableRange) => NuiTableRect | undefined;
  readonly window: NuiTableWindow;
}

export type NuiTableNextEdge = (
  from: TableCellPosition,
  direction: NuiTableEdgeDirection,
) => TableCellPosition;

export interface NuiTableRange {
  readonly from: TableCellPosition;
  readonly to: TableCellPosition;
}

export type NuiTableRanges = readonly NuiTableRange[];

export interface NuiTableContextScope<T> extends NuiTableCellSlot<T> {
  readonly ranges: NuiTableRanges;
}

export type NuiTableContextMenu<T> = (scope: NuiTableContextScope<T>) => readonly NuiMenuEntry[];

export interface NuiTableColumnMenuScope<T> {
  readonly column: NuiTableColumn<T>;
  readonly anchor: HTMLElement;
}

export type NuiTableColumnMenu<T> = (scope: NuiTableColumnMenuScope<T>) => readonly NuiMenuEntry[];

export interface NuiTableCopyOptions {
  readonly headers?: boolean | undefined;
}

export interface NuiTableCommandSink<T> {
  push(command: NuiTableEditEvent<T>): void;
  undo(): number;
  redo(): number;
}

export interface NuiTableClipboardData {
  readonly text: string;
  readonly html?: string | undefined;
}

export interface NuiTableClipboardScope<T> {
  readonly ranges: NuiTableRanges;
  readonly headers: boolean;
  readonly rowAt: (position: number) => T | undefined;
  readonly keyAt: (col: number) => string | undefined;
}

export type NuiTableClipboardBlock = readonly (readonly string[])[];

export interface NuiTableClipboard<T> {
  readonly serialize?: ((scope: NuiTableClipboardScope<T>) => NuiTableClipboardData) | undefined;
  readonly parse?:
    | ((
        data: NuiTableClipboardData,
        target: TableCellPosition,
      ) => NuiTableClipboardBlock | undefined)
    | undefined;
}

export interface NuiTableCsvOptions {
  readonly headers?: boolean | undefined;
  readonly separator?: string | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type NuiTableEditKind = 'edit' | 'clear' | 'cut' | 'paste' | 'undo' | 'redo';

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

export type NuiTableEditRefusalReason = 'control' | 'props' | 'value';

export interface NuiTableEditRefusal<T> {
  readonly row: T;
  readonly key: string;
  readonly reason: NuiTableEditRefusalReason;
}

export type NuiTableEditMove = 'down' | 'up' | 'next' | 'previous' | 'stay' | 'fill' | 'blur';

export type NuiTableEditMode = 'replace' | 'append';

export interface NuiTableStartEditOptions {
  readonly focus?: boolean | undefined;
}

export interface NuiTableDraft {
  readonly row: number;
  readonly col: number;
  readonly key: string;
  readonly value: unknown;
}

export type ParsedCell =
  | { readonly kind: 'value'; readonly value: NuiTableCellValue }
  | { readonly kind: 'invalid' };

export interface TableCellEditorSpec {
  readonly component: Component;
  readonly model: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly toControl: (value: NuiTableCellValue) => unknown;
  readonly fromControl: (value: unknown) => ParsedCell;
}

export type TableEditorPlan =
  | { readonly kind: 'editor'; readonly spec: TableCellEditorSpec }
  | { readonly kind: 'toggle' }
  | { readonly kind: 'refused'; readonly reason: NuiTableEditRefusalReason };

export interface TableEditSession<T> {
  readonly position: TableCellPosition;
  readonly row: T;
  readonly key: string;
  readonly label: string;
  readonly spec: TableCellEditorSpec;
  readonly typed: string | undefined;
  readonly passive: boolean;
}

export interface NuiTableCellEditorProps {
  spec: TableCellEditorSpec;
  value: unknown;
  label: string;
  errorId: string;
  error?: string | undefined;
  typed?: string | undefined;
  passive?: boolean | undefined;
  keep?: ((target: Element) => boolean) | undefined;
  pick?: ((event: KeyboardEvent) => boolean) | undefined;
  attach: (flush: () => void) => () => void;
  commit: (move: NuiTableEditMove) => boolean;
  cancel: () => void;
}

export interface TableSpan {
  readonly start: number;
  readonly end: number;
}

export type TableRangeLines = 'cells' | 'rows' | 'cols';

export type TableRevealAxis = 'both' | 'row' | 'col' | 'none';

export interface TableReveal {
  readonly target: TableCellPosition;
  readonly axis: TableRevealAxis;
}

export interface TableMergeSlot {
  readonly key: string;
  readonly pane: TablePaneName;
  readonly col: number | undefined;
  readonly edge?: boolean | undefined;
  readonly tail?: boolean | undefined;
}

export interface TableLeadSpan {
  readonly kind: 'lead';
  readonly row: number;
  readonly col: number;
  readonly rowspan: number;
  readonly colspan: number;
  readonly span: number;
  readonly anchor: TableCellPosition;
  readonly rows: number;
  readonly cols: number;
  readonly edge: boolean;
  readonly tail: boolean;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type TableCellSpan = TableLeadSpan | { readonly kind: 'covered' };

export type TableRowSpan = ReadonlyMap<string, TableCellSpan>;

export interface TableMergePiece {
  readonly top: number;
  readonly bottom: number;
  readonly start: number;
  readonly end: number;
}

export interface TableMergeLayout<M> {
  readonly spans: ReadonlyMap<number, TableRowSpan>;
  readonly pieces: ReadonlyMap<M, readonly TableMergePiece[]>;
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

export type TableCellLead =
  | ({ readonly kind: 'grip' } & Readonly<NuiTableRowGripProps>)
  | ({ readonly kind: 'toggle' } & Readonly<NuiTableTreeToggleProps>);

export type TableCellView<T> =
  | { readonly kind: 'skeleton' }
  | { readonly kind: 'group'; readonly cell: TableGroupCell | undefined }
  | {
      readonly kind: 'data';
      readonly leads: readonly TableCellLead[];
      readonly editing: boolean;
      readonly scope: NuiTableCellSlot<T>;
    };

export interface NuiTableCellContentProps<T> {
  view: TableCellView<T>;
  editor?: NuiTableCellEditorProps | undefined;
}

export interface TableBodyRowContext<T> {
  readonly utilityAt: (position: number | undefined, column: string) => NuiTableUtilityCellProps;
  readonly cellViewAt: (
    position: number | undefined,
    column: string,
    merge: TableLeadSpan | undefined,
  ) => TableCellView<T>;
  readonly editor: () => NuiTableCellEditorProps | undefined;
  readonly selectAt: (position: number | undefined) => void;
  readonly expandAt: (position: number | undefined) => void;
  readonly grabAt: (position: number | undefined, event: PointerEvent) => void;
  readonly resize: (key: string, event: PointerEvent, position: number | undefined) => void;
  readonly resetSize: (key: string, position: number | undefined) => void;
  readonly update: (value: unknown) => void;
}

export type TableBodyRowView<T> =
  | { readonly kind: 'row'; readonly props: NuiTableRowProps }
  | {
      readonly kind: 'detail';
      readonly props: NuiTableDetailRowProps;
      readonly scope: NuiTableDetailSlot<T>;
    };

export interface NuiTableBodyRowProps<T> {
  view: TableBodyRowView<T>;
  slotted: boolean;
  context: TableBodyRowContext<T>;
}

export interface TableCellContent<T> {
  readonly position: number;
  readonly key: string;
  readonly row: T;
}

export interface TablePinnedRow<T> {
  readonly row: T;
  readonly index: number;
  readonly key: string | number;
  readonly selected: boolean | undefined;
}

export interface NuiTableDetailSlot<T> {
  readonly row: T;
  readonly position: number;
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
  editRefused: [event: NuiTableEditRefusal<T>];
  error: [error: unknown];
  window: [window: NuiTableWindow];
  pick: [range: NuiTableRange];
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
  detail?: (scope: NuiTableDetailSlot<T>) => unknown;
  overlay?: (scope: NuiTableOverlaySlot) => unknown;
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
  exportCsv(options?: NuiTableCsvOptions): Promise<string>;
  refresh(): void;
  rectOf(range: NuiTableRange): NuiTableRect | undefined;
  cellFromPoint(x: number, y: number): TableCellPosition | undefined;
  startEdit(mode: NuiTableEditMode, options?: NuiTableStartEditOptions): boolean;
  commitEdit(move?: NuiTableEditMove): boolean;
  cancelEdit(): void;
  invalidate(ranges?: NuiTableRanges): void;
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
  readonly tail?: boolean | undefined;
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

export type TableBodyPart = 'body' | 'detail';

export type TableRowMode = 'flow' | 'fixed' | 'fluid';

export interface TableDetailSpot {
  readonly position: number;
  readonly id: TableNodeId;
}

export interface TableBodyRow {
  readonly index: number;
  readonly key: number | string;
  readonly node: TableNodeId | undefined;
  readonly part: TableBodyPart;
  readonly revision: number;
  readonly sized: Readonly<Record<string, string>> | undefined;
  readonly frozen: number | undefined;
  readonly edge: boolean;
  readonly level: number | undefined;
  readonly treeLevel: number;
  readonly group: TableGroupRow | undefined;
  readonly expanded: boolean | undefined;
  readonly loading: boolean;
  readonly pending: boolean;
  readonly selected: boolean | undefined;
  readonly stripe: boolean;
}

export interface NuiTableUtilityCellProps {
  control: 'checkbox' | 'skeleton' | 'label' | 'corner' | 'none';
  checked?: boolean | undefined;
  indeterminate?: boolean | undefined;
  disabled?: boolean | undefined;
  label?: string | undefined;
  text?: string | undefined;
}

export type TableGroupCell =
  | {
      readonly kind: 'toggle';
      readonly node: TableNodeId;
      readonly text: string;
      readonly count: string;
    }
  | { readonly kind: 'value'; readonly text: string };

export interface TableGroupRow {
  readonly id: string;
  readonly cells: Readonly<Record<string, TableGroupCell>>;
}

export interface NuiTableRowProps {
  cells: TableRowCells;
  rowIndex: number;
  part?: TableRowPart | undefined;
  wraps?: boolean | undefined;
  position?: number | undefined;
  paint?: TableRowPainter | undefined;
  active?: number | undefined;
  revision?: number | undefined;
  revisionOf?: ((position: number) => number) | undefined;
  level?: number | undefined;
  group?: TableGroupRow | undefined;
  expanded?: boolean | undefined;
  loading?: boolean | undefined;
  selected?: boolean | undefined;
  stripe?: boolean | undefined;
  dragging?: boolean | undefined;
  ranged?: TableRowRanges | undefined;
  rangedAt?: ((position: number) => TableRowRanges | undefined) | undefined;
  spans?: TableRowSpan | undefined;
  ally?: TableCellPosition | undefined;
  marks?: readonly TableSpan[] | undefined;
  sized?: Readonly<Record<string, string>> | undefined;
  sizable?: boolean | undefined;
  sizing?: boolean | undefined;
  frozen?: number | undefined;
  edge?: boolean | undefined;
  head?: ((key: string) => TableHeadState | undefined) | undefined;
  plainText?: ((position: number, key: string) => string | undefined) | undefined;
}

export interface NuiTableDetailRowProps {
  rowIndex: number;
  span: number;
  colspan: number;
  level?: number | undefined;
  active?: boolean | undefined;
}

export interface NuiTableTreeToggleProps {
  node: TableNodeId | undefined;
  level: number;
  expandable: boolean;
  loading: boolean;
}

export interface NuiTableGroupCellProps {
  cell: TableGroupCell | undefined;
}

export interface NuiTableResizerProps {
  axis?: 'x' | 'y' | undefined;
  start?: boolean | undefined;
  active?: boolean | undefined;
}

export interface NuiTableTracksProps {
  tracks: readonly TableTrack[];
}
