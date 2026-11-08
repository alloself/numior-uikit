import type { ChartSpec } from '@numior/charts';
import type { NuiTableExposed, NuiTableOverlaySlot, NuiTableRect } from '@numior/table';
import type { ComputedRef, ShallowRef } from 'vue';
import type {
  BookLocale,
  CellAddress,
  DrawingMark,
  Sheet,
  SheetDrawing,
  Workbook,
} from '../../core';
import type { FrameGrip, SheetCells, SheetEditing, SheetSelection } from '../sheet.types';
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

export interface DrawingBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface DrawingEdges {
  readonly start: number;
  readonly top: number;
  readonly end: number;
  readonly bottom: number;
}

export interface DrawingEdgeLimits {
  readonly box: DrawingBox;
  readonly keepRatio: boolean;
}

export interface DrawingMoving {
  readonly id: string;
  readonly span: DrawingSpan;
}

export interface SheetDrawingsProps {
  readonly drawings: readonly ShownDrawing[];
  readonly rectOf: NuiTableOverlaySlot['rectOf'];
  readonly near: LineNear;
  readonly selected: string | undefined;
  readonly moving: DrawingMoving | undefined;
  readonly editable: boolean;
}

export interface SheetDrawingsOptions {
  readonly book: () => Workbook;
  readonly sheet: () => Sheet | undefined;
  readonly locale: () => BookLocale;
  readonly messages: () => NuiSpreadsheetMessages;
  readonly revision: () => number;
}

export interface DrawingEditOptions {
  readonly sheet: () => Sheet | undefined;
  readonly drawings: () => readonly ShownDrawing[];
  readonly readonly: () => boolean;
  readonly rtl: () => boolean;
  readonly messages: () => NuiSpreadsheetMessages;
  readonly announce: (text: string) => void;
  readonly focus: () => void;
  readonly editing: SheetEditing;
  readonly table: Readonly<ShallowRef<NuiTableExposed | null>>;
  readonly root: Readonly<ShallowRef<HTMLElement | null>>;
}

export interface ChartInsertOptions {
  readonly sheet: () => Sheet | undefined;
  readonly cells: () => SheetCells | undefined;
  readonly readonly: () => boolean;
  readonly rtl: () => boolean;
  readonly messages: () => NuiSpreadsheetMessages;
  readonly announce: (text: string) => void;
  readonly select: (id: string, name: string) => void;
  readonly selection: SheetSelection;
  readonly editing: SheetEditing;
  readonly table: Readonly<ShallowRef<NuiTableExposed | null>>;
  readonly root: Readonly<ShallowRef<HTMLElement | null>>;
}

export interface DrawingEdit {
  readonly selectedId: Readonly<ShallowRef<string | undefined>>;
  readonly moving: Readonly<ShallowRef<DrawingMoving | undefined>>;
  readonly dragging: Readonly<ShallowRef<boolean>>;
  readonly editable: ComputedRef<boolean>;
  select(shown: ShownDrawing): void;
  selectNew(id: string, name: string): void;
  deselect(): void;
  onDown(event: PointerEvent, shown: ShownDrawing): void;
  onGripDown(event: PointerEvent, shown: ShownDrawing, grip: FrameGrip): void;
  onMove(event: PointerEvent): void;
  onUp(): void;
  onCancel(): void;
  onRootDown(event: PointerEvent): void;
  onKeydown(event: KeyboardEvent): void;
}

export const ShownDrawingKind = {
  Picture: 'picture',
  Chart: 'chart',
  Foreign: 'foreign',
} as const;
