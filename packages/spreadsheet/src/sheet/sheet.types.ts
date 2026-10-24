import type { NuiTableCellSource, NuiTableCellStyle, NuiTableRange } from '@numior/table';
import type { BookLocale, CellDecoration, FontStyle, Sheet, ThemePalette, Workbook } from '../core';

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

export type ValueShape = 'number' | 'text' | 'logical' | 'empty';

export type StyleCache = (
  decoration: number,
  shape: ValueShape,
  color: number | undefined,
) => NuiTableCellStyle | undefined;

export interface NuiSpreadsheetProps {
  book: Workbook;
  label: string;
  sheet?: number | undefined;
  locale?: BookLocale | undefined;
  height?: string | undefined;
}

export interface StyleInput {
  readonly decoration: CellDecoration;
  readonly theme: ThemePalette;
  readonly base: FontStyle;
  readonly shape: ValueShape;
  readonly formatColor: number | undefined;
}
