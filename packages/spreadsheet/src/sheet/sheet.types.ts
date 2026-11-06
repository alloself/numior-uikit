import type {
  NuiTableCellSource,
  NuiTableCellStyle,
  NuiTableColumn,
  NuiTableCommandSink,
  NuiTableDraft,
  NuiTableExposed,
  NuiTableRange,
} from '@numior/table';
import type { ComputedRef, ShallowRef } from 'vue';
import type {
  BookLocale,
  Calculator,
  CellDecoration,
  FontStyle,
  Sheet,
  ThemePalette,
  Workbook,
  WorkbookStep,
} from '../core';
import type { NuiSpreadsheetMessages } from './spreadsheet.messages';

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
  editableColumns(columns: readonly NuiTableColumn<number>[]): NuiTableColumn<number>[];
}

export const ValueShape = {
  Number: 'number',
  Text: 'text',
  Logical: 'logical',
  Empty: 'empty',
} as const;
