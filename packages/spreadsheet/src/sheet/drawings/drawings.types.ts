import type { ChartSpec } from '@numior/charts';
import type { NuiTableOverlaySlot, NuiTableRect } from '@numior/table';
import type {
  BookLocale,
  CellAddress,
  DrawingMark,
  Sheet,
  SheetDrawing,
  Workbook,
} from '../../core';
import type { NuiSpreadsheetMessages } from '../spreadsheet.messages';

export interface LineSizes {
  readonly width: (col: number) => number;
  readonly height: (row: number) => number;
}

export interface LineNear {
  readonly row: (line: number) => number;
  readonly col: (line: number) => number;
}

export interface DrawingSpan {
  readonly from: DrawingMark;
  readonly last: CellAddress;
  readonly width: number;
  readonly height: number;
}

export interface ChartSource {
  readonly book: Workbook;
  readonly sheet: Sheet;
  readonly locale: BookLocale;
  readonly seriesName: (index: number) => string;
}

export type ShownDrawing =
  | {
      readonly kind: typeof ShownDrawingKind.Picture;
      readonly drawing: SheetDrawing;
      readonly span: DrawingSpan;
      readonly url: string | undefined;
      readonly label: string;
    }
  | {
      readonly kind: typeof ShownDrawingKind.Chart;
      readonly drawing: SheetDrawing;
      readonly span: DrawingSpan;
      readonly spec: ChartSpec;
      readonly title: string | undefined;
      readonly label: string;
    }
  | {
      readonly kind: typeof ShownDrawingKind.Foreign;
      readonly drawing: SheetDrawing;
      readonly span: DrawingSpan;
      readonly label: string;
    };

export type ShownDrawingKind = (typeof ShownDrawingKind)[keyof typeof ShownDrawingKind];

export interface PlacedDrawing {
  readonly shown: ShownDrawing;
  readonly rect: NuiTableRect;
}

export interface SheetDrawingsProps {
  readonly drawings: readonly ShownDrawing[];
  readonly rectOf: NuiTableOverlaySlot['rectOf'];
  readonly near: LineNear;
}

export interface SheetDrawingsOptions {
  readonly book: () => Workbook;
  readonly sheet: () => Sheet | undefined;
  readonly locale: () => BookLocale;
  readonly messages: () => NuiSpreadsheetMessages;
  readonly revision: () => number;
}

export const ShownDrawingKind = {
  Picture: 'picture',
  Chart: 'chart',
  Foreign: 'foreign',
} as const;
