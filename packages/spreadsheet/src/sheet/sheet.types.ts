import type {
  NuiTableCellSource,
  NuiTableClipboard,
  NuiTableCellStyle,
  NuiTableColumn,
  NuiTableCommandSink,
  NuiTableDraft,
  NuiTableExposed,
  NuiTableRange,
  NuiTableRanges,
  NuiTableRect,
  NuiTableCellPosition,
} from '@numior/table';
import type { NuiListEntry, NuiMenuEntry, NuiSize, NuiTabDescriptor } from '@numior/vue';
import type { ComponentPublicInstance, ComputedRef, Ref, ShallowRef } from 'vue';
import type {
  BookLocale,
  Calculator,
  CellAddress,
  CellClip,
  CellRange,
  CellDecoration,
  ConditionalLook,
  FontStyle,
  HelpLanguage,
  RecalcOptions,
  ReferenceSpan,
  SignaturePart,
  Sheet,
  StepRefusal,
  ThemePalette,
  WorkbookPeer,
  WorkbookPlace,
  Workbook,
  WorkbookDocument,
  WorkbookStep,
} from '../core';
import type { LimitationsReport, OriginalPackage } from '../xlsx/read/read.types';
import type { NuiSpreadsheetSaveAdapter } from './file/file.types';
import type { NuiSpreadsheetMessages } from './spreadsheet.messages';

export interface FormulaSegment {
  readonly key: string;
  readonly text: string;
  readonly tone: number | undefined;
}

export type FrameGrip = (typeof FrameGrip)[keyof typeof FrameGrip];

export type RecalcPhase = (typeof RecalcPhase)[keyof typeof RecalcPhase];

export type CellOutdated = (sheet: Sheet, row: number, col: number) => boolean;

export interface ReferenceFrame {
  readonly key: string;
  readonly span: ReferenceSpan;
  readonly range: NuiTableRange;
  readonly tone: number;
  readonly firstRow: boolean;
  readonly firstCol: boolean;
}

export interface FormulaAssistOptions {
  readonly locale: () => BookLocale;
  readonly language: () => HelpLanguage;
  readonly editing: SheetEditing;
  readonly root: Readonly<ShallowRef<HTMLElement | null>>;
  readonly nameField: Readonly<ShallowRef<HTMLInputElement | null>>;
}

export interface FormulaAssist {
  readonly listId: string;
  readonly hintId: string;
  readonly entries: ComputedRef<readonly NuiListEntry[]>;
  readonly active: Readonly<Ref<number>>;
  readonly open: ComputedRef<boolean>;
  readonly hint: ComputedRef<readonly SignaturePart[]>;
  readonly summary: ComputedRef<string>;
  readonly typed: ComputedRef<number>;
  readonly anchor: Readonly<ShallowRef<HTMLElement | null>>;
  syncCaret(): void;
  onKeydown(event: KeyboardEvent): void;
  choose(key: string): void;
  hover(index: number): void;
}

export interface SheetAssistProps {
  listId: string;
  hintId: string;
  entries: readonly NuiListEntry[];
  active: number;
  anchor: HTMLElement | null;
  open: boolean;
  hint: readonly SignaturePart[];
  summary: string;
  typed: number;
  label: string;
  hintLabel: string;
}

export interface SheetTabsProps {
  shown: boolean;
  tabs: readonly NuiTabDescriptor[];
  current: string;
  readonly: boolean;
  messages: NuiSpreadsheetMessages;
}

export interface SheetCellEditorProps {
  invalid?: boolean | undefined;
  size?: NuiSize | undefined;
}

export interface SheetReferenceProps {
  tone: number;
  rect: NuiTableRect | undefined;
  passive: boolean;
  firstRow: boolean;
  firstCol: boolean;
}

export interface SheetReferencesOptions {
  readonly text: () => string;
  readonly cells: () => SheetCells | undefined;
  readonly sheet: () => Sheet | undefined;
  readonly locale: () => BookLocale;
  readonly editing: SheetEditing;
  readonly table: Readonly<ShallowRef<NuiTableExposed | null>>;
  readonly root: Readonly<ShallowRef<HTMLElement | null>>;
  readonly nameField: Readonly<ShallowRef<HTMLInputElement | null>>;
}

export interface SheetReferences {
  readonly segments: ComputedRef<readonly FormulaSegment[]>;
  readonly frames: ComputedRef<readonly ReferenceFrame[]>;
  readonly dragging: Readonly<ShallowRef<boolean>>;
  picking(draft: NuiTableDraft): boolean;
  onPick(range: NuiTableRange): void;
  onKeydown(event: KeyboardEvent): void;
  onGripDown(event: PointerEvent, frame: ReferenceFrame, grip: FrameGrip): void;
  onGripMove(event: PointerEvent): void;
  onGripUp(): void;
}

export interface SheetCellsOptions {
  readonly book: Workbook;
  readonly sheet: Sheet;
  readonly locale?: BookLocale | undefined;
  readonly outdated?: CellOutdated | undefined;
  readonly calculator?: Calculator | undefined;
}

export type ConditionalLookAt = (row: number, col: number) => ConditionalLook | undefined;

export type LookKeys = (look: ConditionalLook) => string;

export type SheetSource = Required<NuiTableCellSource>;

export interface SheetCells {
  readonly source: SheetSource;
  readonly merges: readonly NuiTableRange[];
  readonly frozenRows: number;
  readonly frozenCols: number;
  readonly rowHeights: Readonly<Record<number, number>>;
  readonly gridlines: boolean;
  readonly rightToLeft: boolean;
  readonly textAt: (position: number, column: number) => string;
  readonly cellOf: (position: number, column: number) => CellAddress;
  readonly rangeOf: (range: NuiTableRange) => CellRange;
  readonly rowAt: (position: number) => number;
  readonly colAt: (position: number) => number;
  readonly rowNear: (line: number) => number;
  readonly colNear: (line: number) => number;
}

export type ValueShape = (typeof ValueShape)[keyof typeof ValueShape];

export type StyleCache = (
  decoration: number,
  shape: ValueShape,
  color: number | undefined,
  look?: ConditionalLook,
) => NuiTableCellStyle | undefined;

export interface NuiSpreadsheetProps {
  book: Workbook;
  calculator?: Calculator | undefined;
  label: string;
  locale?: BookLocale | undefined;
  height?: string | undefined;
  readonly?: boolean | undefined;
  formulaBar?: boolean | undefined;
  sheetTabs?: boolean | undefined;
  contextMenu?: NuiSpreadsheetContextMenu | undefined;
  report?: LimitationsReport | undefined;
  fileBar?: boolean | undefined;
  fileName?: string | undefined;
  source?: OriginalPackage | undefined;
  saveFile?: NuiSpreadsheetSaveAdapter | undefined;
  collaboration?: WorkbookDocument | undefined;
  peers?: readonly WorkbookPeer[] | undefined;
}

export interface SheetRecalcOptions {
  readonly calculator: () => Calculator;
  readonly table: Readonly<ShallowRef<NuiTableExposed | null>>;
}

export interface SheetRecalc {
  readonly phase: Readonly<Ref<RecalcPhase>>;
  readonly progress: Readonly<Ref<number>>;
  readonly revision: Readonly<Ref<number>>;
  readonly outdated: CellOutdated;
  run(options?: RecalcOptions): void;
  stop(): void;
  resume(): void;
}

export interface SheetReportProps {
  readonly report: LimitationsReport | undefined;
  readonly messages: NuiSpreadsheetMessages;
  readonly recalculated: boolean;
}

export interface SheetStatusProps {
  readonly phase: RecalcPhase;
  readonly progress: number;
  readonly messages: NuiSpreadsheetMessages;
}

export interface ReportLine {
  readonly key: string;
  readonly text: string;
}

export interface NuiSpreadsheetExposed {
  refresh(): void;
  apply(steps: readonly WorkbookStep[]): boolean;
  openRules(): void;
  save(): Promise<boolean>;
  open(file: File): Promise<boolean>;
}

export type NuiSpreadsheetPeer = WorkbookPeer;

export type NuiSpreadsheetPlace = WorkbookPlace;

export interface NuiSpreadsheetSelection {
  readonly active: CellAddress;
  readonly ranges: readonly CellRange[];
}

export interface NuiSpreadsheetMenuScope {
  readonly sheet: Sheet;
  readonly selection: NuiSpreadsheetSelection;
}

export type NuiSpreadsheetContextMenu = (scope: NuiSpreadsheetMenuScope) => readonly NuiMenuEntry[];

export interface SheetSelectionOptions {
  readonly cells: () => SheetCells | undefined;
  readonly formula: FormulaBar;
  readonly table: Readonly<ShallowRef<NuiTableExposed | null>>;
  readonly model: Ref<NuiSpreadsheetSelection | undefined>;
}

export interface SheetLinesOptions {
  readonly sheet: () => Sheet | undefined;
  readonly selection: SheetSelection;
  readonly editing: SheetEditing;
  readonly messages: ComputedRef<NuiSpreadsheetMessages>;
  readonly readonly: () => boolean;
  readonly extra: () => NuiSpreadsheetContextMenu | undefined;
  readonly tools: () => readonly NuiMenuEntry[];
  readonly announce: (text: string) => void;
}

export interface SheetLines {
  menu(): readonly NuiMenuEntry[];
}

export interface SheetSelection {
  readonly current: ComputedRef<NuiSpreadsheetSelection | undefined>;
  select(next: NuiSpreadsheetSelection): void;
}

export interface NuiSpreadsheetChange {
  readonly steps: readonly WorkbookStep[];
}

export interface StyleInput {
  readonly decoration: CellDecoration;
  readonly theme: ThemePalette;
  readonly base: FontStyle;
  readonly shape: ValueShape;
  readonly formatColor: number | undefined;
}

export interface SheetEditingOptions {
  readonly book: () => Workbook;
  readonly calculator: () => Calculator;
  readonly sheet: () => Sheet | undefined;
  readonly cells: () => SheetCells | undefined;
  readonly locale: () => BookLocale;
  readonly readonly: () => boolean;
  readonly messages: ComputedRef<NuiSpreadsheetMessages>;
  readonly table: Readonly<ShallowRef<NuiTableExposed | null>>;
  readonly recalc: SheetRecalc;
  readonly collaboration: () => WorkbookDocument | undefined;
  readonly changed: (change: NuiSpreadsheetChange) => void;
}

export interface SheetEditing {
  readonly draft: Readonly<ShallowRef<NuiTableDraft | undefined>>;
  readonly revision: Readonly<Ref<number>>;
  readonly commands: NuiTableCommandSink<number>;
  setDraft(next: NuiTableDraft | undefined): void;
  apply(steps: readonly WorkbookStep[]): boolean;
  attempt(steps: readonly WorkbookStep[]): StepRefusal | undefined;
  redraw(): void;
  inputAt(position: NuiTableCellPosition): string;
  editableColumns(columns: readonly NuiTableColumn<number>[]): NuiTableColumn<number>[];
}

export interface SheetPopoverOptions {
  readonly focusStart: () => void;
  readonly closed: () => void;
  readonly back: () => void;
}

export interface SheetAnchor {
  readonly key: string;
  readonly rect: NuiTableRect;
  readonly hold: SheetPopover['holdAnchor'];
}

export interface SheetPopover {
  readonly open: Ref<boolean>;
  readonly shown: Readonly<Ref<boolean>>;
  readonly titleId: string;
  readonly anchor: Readonly<ShallowRef<HTMLElement | undefined>>;
  holdAnchor(element: Element | ComponentPublicInstance | null): void;
  show(): void;
  hide(): void;
  setOpen(open: boolean): void;
  onToggle(event: Event): void;
}

export interface FormulaBarOptions {
  readonly book: () => Workbook;
  readonly sheet: () => Sheet | undefined;
  readonly cells: () => SheetCells | undefined;
  readonly readonly: () => boolean;
  readonly messages: ComputedRef<NuiSpreadsheetMessages>;
  readonly editing: SheetEditing;
  readonly table: Readonly<ShallowRef<NuiTableExposed | null>>;
  readonly root: Readonly<ShallowRef<HTMLElement | null>>;
  readonly bar: Readonly<ShallowRef<HTMLElement | null>>;
  readonly nameField: Readonly<ShallowRef<HTMLInputElement | null>>;
  readonly formulaField: Readonly<ShallowRef<HTMLTextAreaElement | null>>;
}

export interface FormulaBar {
  readonly active: Ref<NuiTableCellPosition | undefined>;
  readonly ranges: Ref<NuiTableRanges>;
  readonly nameText: ComputedRef<string>;
  readonly nameInvalid: Readonly<Ref<boolean>>;
  readonly formulaText: ComputedRef<string>;
  readonly expanded: Readonly<Ref<boolean>>;
  readonly announcement: Ref<string>;
  keepEditing(target: Element): boolean;
  toggle(): void;
  backToGrid(): void;
  holdFocus(): void;
  onNameFocus(): void;
  onNameInput(): void;
  onNameKeydown(event: KeyboardEvent): void;
  onNameBlur(): void;
  onFormulaFocus(): void;
  onFormulaInput(): void;
  onFormulaKeydown(event: KeyboardEvent): void;
  onFormulaBlur(event: FocusEvent): void;
}

export interface SheetClipboardOptions {
  readonly book: () => Workbook;
  readonly calculator: () => Calculator;
  readonly sheet: () => Sheet | undefined;
  readonly cells: () => SheetCells | undefined;
  readonly editing: SheetEditing;
}

export interface SheetClipMark {
  readonly clip: CellClip;
  readonly text: string;
  readonly sheet: Sheet;
  readonly range: CellRange;
  readonly revision: number;
  readonly cut: boolean;
}

export interface SheetClipFrame {
  readonly key: string;
  readonly range: NuiTableRange;
}

export interface SheetClipboard {
  readonly hooks: NuiTableClipboard<number>;
  readonly commands: NuiTableCommandSink<number>;
  readonly frames: ComputedRef<readonly SheetClipFrame[]>;
  forget(): void;
}

export interface SheetFillOptions {
  readonly book: () => Workbook;
  readonly calculator: () => Calculator;
  readonly sheet: () => Sheet | undefined;
  readonly cells: () => SheetCells | undefined;
  readonly editing: SheetEditing;
  readonly selection: SheetSelection;
  readonly table: Readonly<ShallowRef<NuiTableExposed | null>>;
  readonly root: Readonly<ShallowRef<HTMLElement | null>>;
  readonly readonly: () => boolean;
  readonly messages: ComputedRef<NuiSpreadsheetMessages>;
  readonly announce: (text: string) => void;
}

export type SheetFillTarget =
  | { readonly kind: typeof FillTargetKind.Extend; readonly range: CellRange }
  | {
      readonly kind: typeof FillTargetKind.Clear;
      readonly range: CellRange;
      readonly kept: CellRange;
    };

export interface SheetFillSession {
  readonly source: CellRange;
  readonly target: SheetFillTarget | undefined;
  readonly copy: boolean;
}

export interface SheetFill {
  readonly handle: ComputedRef<NuiTableRange | undefined>;
  readonly preview: ComputedRef<NuiTableRange | undefined>;
  readonly clearing: ComputedRef<NuiTableRange | undefined>;
  onDown(event: PointerEvent): void;
  onMove(event: PointerEvent): void;
  onUp(): void;
  onCancel(): void;
  onDblclick(): void;
  onKeydown(event: KeyboardEvent): void;
}

export interface ShownClip {
  readonly key: string;
  readonly rect: NuiTableRect;
}

export interface SheetPeerFrame {
  readonly key: string;
  readonly name: string;
  readonly tone: number;
  readonly cell: NuiTableRange;
  readonly areas: readonly NuiTableRange[];
  readonly flagBelow: boolean;
}

export interface ShownPeerArea {
  readonly key: string;
  readonly rect: NuiTableRect;
}

export interface ShownPeerFrame {
  readonly key: string;
  readonly name: string;
  readonly tone: number;
  readonly flagBelow: boolean;
  readonly rect: NuiTableRect | undefined;
  readonly areas: readonly ShownPeerArea[];
}

export interface SheetPeersProps {
  readonly peers: readonly WorkbookPeer[];
  readonly sheet: string | undefined;
  readonly cells: SheetCells | undefined;
  readonly rectOf: (range: NuiTableRange) => NuiTableRect | undefined;
}

export interface SheetMarksProps {
  readonly rectOf: (range: NuiTableRange) => NuiTableRect | undefined;
  readonly handle: NuiTableRange | undefined;
  readonly preview: NuiTableRange | undefined;
  readonly clearing: NuiTableRange | undefined;
  readonly clips: readonly SheetClipFrame[];
  readonly lit: readonly SheetClipFrame[];
  readonly frozenRows?: number | undefined;
  readonly frozenCols?: number | undefined;
}

export type FillKey = (typeof FillKey)[keyof typeof FillKey];

export const ValueShape = {
  Number: 'number',
  Text: 'text',
  Logical: 'logical',
  Empty: 'empty',
} as const;

export const FillKey = { Down: 'down', Right: 'right' } as const;

export const FillTargetKind = { Extend: 'extend', Clear: 'clear' } as const;

export const FrameGrip = {
  Top: 'top',
  Bottom: 'bottom',
  Start: 'start',
  End: 'end',
  TopStart: 'top-start',
  TopEnd: 'top-end',
  BottomStart: 'bottom-start',
  BottomEnd: 'bottom-end',
} as const;

export const RecalcPhase = { Idle: 'idle', Running: 'running', Stopped: 'stopped' } as const;
