import type {
  NuiTableCellSource,
  NuiTableCellStyle,
  NuiTableColumn,
  NuiTableCommandSink,
  NuiTableDraft,
  NuiTableExposed,
  NuiTableRange,
  NuiTableRanges,
  NuiTableRect,
  TableCellPosition,
} from '@numior/table';
import type { NuiListEntry } from '@numior/vue';
import type { ComputedRef, Ref, ShallowRef } from 'vue';
import type {
  BookLocale,
  Calculator,
  CellDecoration,
  FontStyle,
  HelpLanguage,
  ReferenceSpan,
  SignaturePart,
  Sheet,
  ThemePalette,
  Workbook,
  WorkbookStep,
} from '../core';
import type { NuiSpreadsheetMessages } from './spreadsheet.messages';

export interface FormulaSegment {
  readonly key: string;
  readonly text: string;
  readonly tone: number | undefined;
}

export type FrameGrip = (typeof FrameGrip)[keyof typeof FrameGrip];

export interface ReferenceFrame {
  readonly key: string;
  readonly span: ReferenceSpan;
  readonly range: NuiTableRange;
  readonly tone: number;
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
  label: string;
}

export interface SheetReferenceProps {
  tone: number;
  rect: NuiTableRect | undefined;
}

export interface SheetReferencesOptions {
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
}

export interface SheetCells {
  readonly source: NuiTableCellSource;
  readonly merges: readonly NuiTableRange[];
  readonly frozenRows: number;
  readonly frozenCols: number;
  readonly rowHeights: Readonly<Record<number, number>>;
  readonly gridlines: boolean;
  readonly rightToLeft: boolean;
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
) => NuiTableCellStyle | undefined;

export interface NuiSpreadsheetProps {
  book: Workbook;
  calculator?: Calculator | undefined;
  label: string;
  sheet?: number | undefined;
  locale?: BookLocale | undefined;
  height?: string | undefined;
  readonly?: boolean | undefined;
  formulaBar?: boolean | undefined;
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
  readonly changed: (change: NuiSpreadsheetChange) => void;
}

export interface SheetEditing {
  readonly draft: Readonly<ShallowRef<NuiTableDraft | undefined>>;
  readonly commands: NuiTableCommandSink<number>;
  setDraft(next: NuiTableDraft | undefined): void;
  inputAt(position: TableCellPosition): string;
  editableColumns(columns: readonly NuiTableColumn<number>[]): NuiTableColumn<number>[];
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
  readonly active: Ref<TableCellPosition | undefined>;
  readonly ranges: Ref<NuiTableRanges>;
  readonly nameText: ComputedRef<string>;
  readonly nameInvalid: Readonly<Ref<boolean>>;
  readonly formulaText: ComputedRef<string>;
  readonly expanded: Readonly<Ref<boolean>>;
  readonly announcement: Readonly<Ref<string>>;
  keepEditing(target: Element): boolean;
  toggle(): void;
  onNameFocus(): void;
  onNameInput(): void;
  onNameKeydown(event: KeyboardEvent): void;
  onNameBlur(): void;
  onFormulaFocus(): void;
  onFormulaInput(): void;
  onFormulaKeydown(event: KeyboardEvent): void;
  onFormulaBlur(event: FocusEvent): void;
}

export const ValueShape = {
  Number: 'number',
  Text: 'text',
  Logical: 'logical',
  Empty: 'empty',
} as const;

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
