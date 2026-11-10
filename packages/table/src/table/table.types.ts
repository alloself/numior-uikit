import type { Component } from 'vue';
import type { FieldRule } from '@numior/forms';
import type {
  AriaValue,
  Guard,
  IconSource,
  NuiControlRegistry,
  ReorderAxis,
} from '@numior/primitives';
import type { NuiMenuEntry, NuiPaginationProps } from '@numior/vue';
import type {
  TableAggregate,
  TableAggregateFn,
  TableAggregateKind,
  TableDistinct,
  TableFilter,
  TableFilterValue,
  TableNodeId,
  TableProgress,
  TableSort,
  TableSortDirection,
  TableSource,
} from '../engine';

export type ClearKind = (typeof ClearKind)[keyof typeof ClearKind];

export type RunKind = (typeof RunKind)[keyof typeof RunKind];

export type SessionMode = (typeof SessionMode)[keyof typeof SessionMode];

export type RowZone = (typeof RowZone)[keyof typeof RowZone];

export type MergeSide = (typeof MergeSide)[keyof typeof MergeSide];

export type NuiTableSize = (typeof NuiTableSize)[keyof typeof NuiTableSize];

export type TableUtilityControl = (typeof TableUtilityControl)[keyof typeof TableUtilityControl];

export type NuiTableAlign = (typeof NuiTableAlign)[keyof typeof NuiTableAlign];

export type NuiTablePin = (typeof NuiTablePin)[keyof typeof NuiTablePin];

export type NuiTableCellScheme = (typeof NuiTableCellScheme)[keyof typeof NuiTableCellScheme];

export type NuiTableSelection = (typeof NuiTableSelection)[keyof typeof NuiTableSelection];

export type NuiTablePagination = Partial<Omit<NuiPaginationProps, 'total' | 'size'>>;

export type TableColumnKind = (typeof TableColumnKind)[keyof typeof TableColumnKind];

export interface TablePageWindow {
  readonly start: number;
  readonly end: number;
}

export type NuiTableFilterKind = (typeof NuiTableFilterKind)[keyof typeof NuiTableFilterKind];

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
  readonly type: typeof NuiTableColumnType.Text;
  readonly value: (row: T) => string | null | undefined;
  readonly format?: ((value: string, row: T | undefined) => string) | undefined;
  readonly aggregate?: 'count' | TableAggregateFn<T> | undefined;
}

export interface NuiTableNumberColumn<T>
  extends NuiTableColumnBase, NuiTableColumnEditing<T, number> {
  readonly type: typeof NuiTableColumnType.Number;
  readonly value: (row: T) => number | null | undefined;
  readonly format?: ((value: number, row: T | undefined) => string) | undefined;
  readonly aggregate?: TableAggregate<T> | undefined;
}

export interface NuiTableDateColumn<T>
  extends NuiTableColumnBase, NuiTableColumnEditing<T, Date | number, string> {
  readonly type: typeof NuiTableColumnType.Date;
  readonly value: (row: T) => Date | number | null | undefined;
  readonly format?: ((value: Date, row: T | undefined) => string) | undefined;
  readonly aggregate?:
    | typeof TableAggregateKind.Min
    | typeof TableAggregateKind.Max
    | typeof TableAggregateKind.Count
    | TableAggregateFn<T>
    | undefined;
}

export interface NuiTableBooleanColumn<T>
  extends NuiTableColumnBase, NuiTableColumnEditing<T, boolean> {
  readonly type: typeof NuiTableColumnType.Boolean;
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
  rowHeight?: number | typeof NuiTableRowHeight.Auto | undefined;
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
  gridlines?: boolean | undefined;
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
  lastCell?: NuiTableLastCell | undefined;
  keepEditing?: ((target: Element) => boolean) | undefined;
  growEditor?: boolean | undefined;
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

export interface NuiTableCellBar {
  readonly length: number;
  readonly color: string;
}

export interface NuiTableCellIcon {
  readonly icon: IconSource;
  readonly color: string;
  readonly filled?: boolean | undefined;
}

export interface NuiTableCellStyle {
  readonly class?: string | undefined;
  readonly fill?: string | undefined;
  readonly color?: string | undefined;
  readonly align?: NuiTableAlign | undefined;
  readonly wrap?: boolean | undefined;
  readonly overflow?: boolean | undefined;
  readonly borders?: NuiTableCellBorders | undefined;
  readonly bar?: NuiTableCellBar | undefined;
  readonly icon?: NuiTableCellIcon | undefined;
  readonly scheme?: NuiTableCellScheme | undefined;
  readonly style?: Readonly<Record<string, string>> | undefined;
}

export type NuiTableCellStyler<T> = (cell: NuiTableCellRef<T>) => NuiTableCellStyle | undefined;

export interface TableCellPaint {
  readonly class: readonly unknown[];
  readonly style: Readonly<Record<string, string>>;
  readonly align: NuiTableAlign | undefined;
  readonly overflow: boolean;
  readonly spill?: string | undefined;
  readonly flows?: boolean | undefined;
  readonly icon?: NuiTableCellIcon | undefined;
}

export type TableRowPaint = ReadonlyMap<string, TableCellPaint>;

export interface TableSpillCover {
  readonly text: string;
  readonly style: Readonly<Record<string, string>>;
}

export type TableRowPainter = (position: number, spans?: TableRowSpan) => TableRowPaint | undefined;

export type NuiTableEdgeDirection =
  (typeof NuiTableEdgeDirection)[keyof typeof NuiTableEdgeDirection];

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

export type NuiTableOverlayPane = (typeof NuiTableOverlayPane)[keyof typeof NuiTableOverlayPane];

export interface NuiTableOverlaySlot {
  readonly rectOf: (range: NuiTableRange) => NuiTableRect | undefined;
  readonly window: NuiTableWindow;
  readonly pane: NuiTableOverlayPane;
}

export type NuiTableNextEdge = (
  from: NuiTableCellPosition,
  direction: NuiTableEdgeDirection,
) => NuiTableCellPosition;

export type NuiTableLastCell = () => NuiTableCellPosition | undefined;

export interface NuiTableRange {
  readonly from: NuiTableCellPosition;
  readonly to: NuiTableCellPosition;
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
  readonly clear?: ((ranges: NuiTableRanges) => number) | undefined;
}

export interface NuiTableClipboardData {
  readonly text: string;
  readonly html?: string | undefined;
}

export interface NuiTableClipboardScope<T> {
  readonly ranges: NuiTableRanges;
  readonly rows: readonly number[];
  readonly cols: readonly number[];
  readonly headers: boolean;
  readonly rowAt: (position: number) => T | undefined;
  readonly keyAt: (col: number) => string | undefined;
}

export type NuiTableClipboardBlock = readonly (readonly string[])[];

export interface NuiTablePasteScope {
  readonly ranges: NuiTableRanges;
  readonly target: NuiTableCellPosition;
}

export interface NuiTableClipboard<T> {
  readonly serialize?:
    | ((scope: NuiTableClipboardScope<T>) => NuiTableClipboardData | Promise<NuiTableClipboardData>)
    | undefined;
  readonly paste?:
    | ((data: NuiTableClipboardData, scope: NuiTablePasteScope) => NuiTableRanges | undefined)
    | undefined;
  readonly cut?: ((ranges: NuiTableRanges) => boolean) | undefined;
  readonly parse?:
    | ((
        data: NuiTableClipboardData,
        target: NuiTableCellPosition,
      ) => NuiTableClipboardBlock | undefined)
    | undefined;
}

export interface NuiTableCsvOptions {
  readonly headers?: boolean | undefined;
  readonly separator?: string | undefined;
  readonly formulas?: boolean | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type NuiTableEditKind = (typeof NuiTableEditKind)[keyof typeof NuiTableEditKind];

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

export type NuiTableEditRefusalReason =
  (typeof NuiTableEditRefusalReason)[keyof typeof NuiTableEditRefusalReason];

export interface NuiTableEditRefusal<T> {
  readonly row: T;
  readonly key: string;
  readonly reason: NuiTableEditRefusalReason;
}

export type NuiTableEditMove = (typeof NuiTableEditMove)[keyof typeof NuiTableEditMove];

export type NuiTableEditMode = (typeof NuiTableEditMode)[keyof typeof NuiTableEditMode];

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
  | { readonly kind: typeof ParsedCellKind.Value; readonly value: NuiTableCellValue }
  | { readonly kind: typeof ParsedCellKind.Invalid };

export interface TableCellEditorSpec {
  readonly component: Component;
  readonly model: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly toControl: (value: NuiTableCellValue) => unknown;
  readonly fromControl: (value: unknown) => ParsedCell;
}

export type TableEditorPlan =
  | { readonly kind: typeof TableEditorPlanKind.Editor; readonly spec: TableCellEditorSpec }
  | { readonly kind: typeof TableEditorPlanKind.Toggle }
  | {
      readonly kind: typeof TableEditorPlanKind.Refused;
      readonly reason: NuiTableEditRefusalReason;
    };

export interface TableEditSession<T> {
  readonly position: NuiTableCellPosition;
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
  grow?: boolean | undefined;
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

export type TableRangeLines = (typeof TableRangeLines)[keyof typeof TableRangeLines];

export type TableRevealAxis = (typeof TableRevealAxis)[keyof typeof TableRevealAxis];

export interface TableReveal {
  readonly target: NuiTableCellPosition;
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
  readonly kind: typeof TableCellSpanKind.Lead;
  readonly row: number;
  readonly col: number;
  readonly rowspan: number;
  readonly colspan: number;
  readonly span: number;
  readonly anchor: NuiTableCellPosition;
  readonly rows: number;
  readonly cols: number;
  readonly edge: boolean;
  readonly tail: boolean;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type TableCellSpan = TableLeadSpan | { readonly kind: typeof TableCellSpanKind.Covered };

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
  | ({ readonly kind: typeof TableCellLeadKind.Grip } & Readonly<NuiTableRowGripProps>)
  | ({ readonly kind: typeof TableCellLeadKind.Toggle } & Readonly<NuiTableTreeToggleProps>)
  | ({ readonly kind: typeof TableCellLeadKind.Icon } & NuiTableCellIcon);

export type TableCellView<T> =
  | { readonly kind: typeof TableCellViewKind.Skeleton }
  | { readonly kind: typeof TableCellViewKind.Group; readonly cell: TableGroupCell | undefined }
  | {
      readonly kind: typeof TableCellViewKind.Data;
      readonly leads: readonly TableCellLead[];
      readonly editing: boolean;
      readonly scope: NuiTableCellSlot<T>;
    };

export interface NuiTableCellContentProps<T> {
  view: TableCellView<T>;
  editor?: NuiTableCellEditorProps | undefined;
  icon?: NuiTableCellIcon | undefined;
}

export interface TableBodyRowContext<T> {
  readonly utilityAt: (item: TableBodyRow | undefined, column: string) => NuiTableUtilityCellProps;
  readonly cellViewAt: (
    item: TableBodyRow | undefined,
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
  | {
      readonly kind: typeof TableBodyRowViewKind.Row;
      readonly item: TableBodyRow;
      readonly props: NuiTableRowProps;
    }
  | {
      readonly kind: typeof TableBodyRowViewKind.Detail;
      readonly item: TableBodyRow;
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
  columnResize: [changes: readonly NuiTableColumnResize[]];
}

export type NuiTableSort = readonly TableSort[];

export type NuiTableFilters = readonly NuiTableColumnFilter[];

export type NuiTableGroupBy = readonly string[];

export type NuiTableExpanded = readonly TableNodeId[];

export type NuiTablePins = Readonly<Record<string, NuiTablePin | null>>;

export type NuiTableHidden = readonly string[];

export type NuiTableWidths = Readonly<Record<string, number>>;

export interface NuiTableColumnResize {
  readonly key: string;
  readonly width: number | undefined;
}

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
  | {
      readonly kind: typeof TableDropMarkKind.Line;
      readonly start: number;
      readonly inset?: TableDropInset | undefined;
    }
  | { readonly kind: typeof TableDropMarkKind.Box; readonly start: number; readonly size: number };

export type TableBandRule = (typeof TableBandRule)[keyof typeof TableBandRule];

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

export interface NuiTableScrollPosition {
  readonly top: number;
  readonly left: number;
}

export interface NuiTableExposed {
  scrollToRow(position: number): void;
  scrollToColumn(key: string): void;
  copy(options?: NuiTableCopyOptions): Promise<boolean>;
  undo(): boolean;
  redo(): boolean;
  exportCsv(options?: NuiTableCsvOptions): Promise<string>;
  refresh(): void;
  rectOf(range: NuiTableRange): NuiTableRect | undefined;
  cellFromPoint(x: number, y: number): NuiTableCellPosition | undefined;
  cellNear(x: number, y: number): NuiTableCellPosition | undefined;
  followEdge(x: number, y: number, onStep: () => void): void;
  stopEdge(): void;
  scrollPosition(): NuiTableScrollPosition;
  startEdit(mode: NuiTableEditMode, options?: NuiTableStartEditOptions): boolean;
  commitEdit(move?: NuiTableEditMove): boolean;
  cancelEdit(): void;
  focusCell(position: NuiTableCellPosition, scroll?: boolean): boolean;
  invalidate(ranges?: NuiTableRanges): void;
}

export type TablePaneName = (typeof TablePaneName)[keyof typeof TablePaneName];

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
  readonly kind: typeof TablePlacementKind.Gap;
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
  expanded: typeof AriaValue.True | typeof AriaValue.False;
  menuLabel?: string | undefined;
  menuExpanded: typeof AriaValue.True | typeof AriaValue.False;
  grip?: NuiTableGripProps | undefined;
}

export interface NuiTableGripProps {
  active?: boolean | undefined;
}

export interface NuiTableDragLayerProps {
  axis?: ReorderAxis | undefined;
  drop?: TableDropMark | undefined;
  ghost?: TableGhost | undefined;
}

export interface NuiTableRowGripProps {
  label: string;
  disabled?: boolean | undefined;
  active?: boolean | undefined;
}

export interface NuiTableCellPosition {
  readonly row: number;
  readonly col: number;
}

export type TableHeaderTarget =
  | { readonly kind: typeof TableHeaderTargetKind.Column; readonly key: string }
  | { readonly kind: typeof TableHeaderTargetKind.Slot; readonly index: number };

export type TableRowPart = (typeof TableRowPart)[keyof typeof TableRowPart];

export type TableStatusSlot = (typeof TableStatusSlot)[keyof typeof TableStatusSlot];

export interface TableSkeletonRow {
  readonly index: number;
  readonly key: string;
}

export type TableBodyPart = (typeof TableBodyPart)[keyof typeof TableBodyPart];

export type TableRowMode = (typeof TableRowMode)[keyof typeof TableRowMode];

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
  control: TableUtilityControl;
  checked?: boolean | undefined;
  indeterminate?: boolean | undefined;
  disabled?: boolean | undefined;
  label?: string | undefined;
  text?: string | undefined;
}

export type TableGroupCell =
  | {
      readonly kind: typeof TableGroupCellKind.Toggle;
      readonly node: TableNodeId;
      readonly text: string;
      readonly count: string;
    }
  | { readonly kind: typeof TableGroupCellKind.Value; readonly text: string };

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
  ally?: NuiTableCellPosition | undefined;
  marks?: readonly TableSpan[] | undefined;
  sized?: Readonly<Record<string, string>> | undefined;
  sizable?: boolean | undefined;
  sizing?: boolean | undefined;
  frozen?: number | undefined;
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
  axis?: ReorderAxis | undefined;
  start?: boolean | undefined;
  active?: boolean | undefined;
}

export interface NuiTableTracksProps {
  tracks: readonly TableTrack[];
}

export interface TableScrollMark {
  readonly element: Element;
  readonly top: number;
  readonly left: number;
}

export const NuiTableSize = { Sm: 'sm', Md: 'md', Lg: 'lg' } as const;

export const NuiTableAlign = { Start: 'start', Center: 'center', End: 'end' } as const;

export const NuiTablePin = { Start: 'start', End: 'end' } as const;

export const NuiTableCellScheme = { Light: 'light', Dark: 'dark' } as const;

export const NuiTableSelection = { Single: 'single', Multiple: 'multiple' } as const;

export const TableColumnKind = { Data: 'data', Select: 'select', Rowhead: 'rowhead' } as const;

export const NuiTableOverlayPane = {
  Body: 'body',
  Start: 'start',
  End: 'end',
  Top: 'top',
  TopStart: 'top-start',
  TopEnd: 'top-end',
} as const;

export const NuiTableFilterKind = {
  Text: 'text',
  Number: 'number',
  Date: 'date',
  Set: 'set',
} as const;

export const NuiTableEdgeDirection = {
  Up: 'up',
  Down: 'down',
  Previous: 'previous',
  Next: 'next',
} as const;

export const NuiTableEditKind = {
  Edit: 'edit',
  Clear: 'clear',
  Cut: 'cut',
  Paste: 'paste',
  Undo: 'undo',
  Redo: 'redo',
} as const;

export const NuiTableEditRefusalReason = {
  Control: 'control',
  Props: 'props',
  Value: 'value',
} as const;

export const NuiTableEditMove = {
  Down: 'down',
  Up: 'up',
  Next: 'next',
  Previous: 'previous',
  Stay: 'stay',
  Fill: 'fill',
  Blur: 'blur',
} as const;

export const NuiTableEditMode = { Replace: 'replace', Append: 'append' } as const;

export const TableRangeLines = { Cells: 'cells', Rows: 'rows', Cols: 'cols' } as const;

export const TableRevealAxis = { Both: 'both', Row: 'row', Col: 'col', None: 'none' } as const;

export const TableBandRule = { Start: 'start', End: 'end', Both: 'both' } as const;

export const TablePaneName = { Start: 'start', Centre: 'centre', End: 'end' } as const;

export const TableRowPart = {
  Band: 'band',
  Head: 'head',
  Pinned: 'pinned',
  Body: 'body',
  Foot: 'foot',
  Skeleton: 'skeleton',
} as const;

export const TableStatusSlot = { Empty: 'empty', Loading: 'loading' } as const;

export const TableBodyPart = { Body: 'body', Detail: 'detail' } as const;

export const TableRowMode = { Flow: 'flow', Fixed: 'fixed', Fluid: 'fluid' } as const;

export const MergeSide = { Top: 'top', Bottom: 'bottom', Start: 'start', End: 'end' } as const;

export const RowZone = { Before: 'before', After: 'after', Inside: 'inside' } as const;

export const SessionMode = { Plain: 'plain', Extend: 'extend', Add: 'add' } as const;

export const RunKind = { Query: 'query', Totals: 'totals' } as const;

export const ClearKind = { Clear: 'clear', Cut: 'cut' } as const;

export const NuiTableRowHeight = { Auto: 'auto' } as const;

export const TableUtilityControl = {
  Checkbox: 'checkbox',
  Skeleton: 'skeleton',
  Label: 'label',
  Corner: 'corner',
  None: 'none',
} as const;

export const PastePlanKind = { None: 'none', Limit: 'limit', Cells: 'cells' } as const;

export const CopyShapeKind = { Block: 'block', Disjoint: 'disjoint' } as const;

export const NuiTableColumnType = {
  Text: 'text',
  Number: 'number',
  Date: 'date',
  Boolean: 'boolean',
} as const;

export const ParsedCellKind = { Value: 'value', Invalid: 'invalid' } as const;

export const TableEditorPlanKind = {
  Editor: 'editor',
  Toggle: 'toggle',
  Refused: 'refused',
} as const;

export const TableCellSpanKind = { Lead: 'lead', Covered: 'covered' } as const;

export const TableCellLeadKind = { Grip: 'grip', Toggle: 'toggle', Icon: 'icon' } as const;

export const TableCellViewKind = { Skeleton: 'skeleton', Group: 'group', Data: 'data' } as const;

export const TableBodyRowViewKind = { Row: 'row', Detail: 'detail' } as const;

export const TableDropMarkKind = { Line: 'line', Box: 'box' } as const;

export const TableHeaderTargetKind = { Column: 'column', Slot: 'slot' } as const;

export const TableGroupCellKind = { Toggle: 'toggle', Value: 'value' } as const;

export const TableOpeningKind = { Gesture: 'gesture', Typed: 'typed', Start: 'start' } as const;

export const CopyPlanKind = { Cell: 'cell', Block: 'block', Disjoint: 'disjoint' } as const;

export const SessionActionKind = { Shape: 'shape', Remove: 'remove' } as const;

export const RangeOriginKind = { Lines: 'lines', All: 'all' } as const;

export const TablePlacementKind = { ...TableColumnKind, Gap: 'gap' } as const;

export const TsvChar = { Quote: '"', Tab: '\t', Return: '\r', Newline: '\n' } as const;

export const KeyCode = { A: 'KeyA', C: 'KeyC' } as const;

export const Letter = { A: 'a', C: 'c' } as const;

export const DatePart = { Month: 'month' } as const satisfies Record<
  string,
  Intl.DateTimeFormatPartTypes
>;

export const CellOutcomeMark = { Skip: 'skip', Same: 'same' } as const;
