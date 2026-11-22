import type { ChartSpec } from '@numior/charts';
import type { FloatingPlacement, VersionRead } from '@numior/primitives';
import type { NuiTableExposed, NuiTableOverlaySlot, NuiTableRect } from '@numior/table';
import type { NuiMenuEntry, NuiMenuFocus } from '@numior/vue';
import type { ComputedRef, Ref, ShallowRef } from 'vue';
import type {
  BookLocale,
  CellAddress,
  DrawingMark,
  DrawingSize,
  Sheet,
  SheetChart,
  SheetDrawing,
  Workbook,
} from '../../core';
import type {
  FrameGrip,
  Refuse,
  SheetCells,
  SheetEditing,
  SheetPopover,
  SheetSelection,
} from '../sheet.types';
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
  readonly cells?: DrawingSize | undefined;
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
      readonly legend: boolean;
      readonly label: string;
    }
  | {
      readonly kind: typeof ShownDrawingKind.Foreign;
      readonly drawing: SheetDrawing;
      readonly span: DrawingSpan;
      readonly label: string;
    };

export type ShownDrawingKind = (typeof ShownDrawingKind)[keyof typeof ShownDrawingKind];

export interface DrawingBodyProps {
  readonly shown: ShownDrawing;
}

export interface DrawingFrozen {
  readonly rows: number;
  readonly cols: number;
}

export interface DrawingPlace {
  readonly rect: NuiTableRect;
  readonly frame: NuiTableRect;
}

export interface PlacedDrawing extends DrawingPlace {
  readonly shown: ShownDrawing;
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
  readonly frozenRows: number;
  readonly frozenCols: number;
  readonly selected: string | undefined;
  readonly moving: DrawingMoving | undefined;
  readonly editable: boolean;
  readonly settingsLabel: string;
}

export interface SheetDrawingsOptions {
  readonly book: () => Workbook;
  readonly sheet: () => Sheet | undefined;
  readonly locale: () => BookLocale;
  readonly messages: () => NuiSpreadsheetMessages;
  readonly revision: VersionRead;
}

export interface DrawingEditOptions {
  readonly sheet: () => Sheet | undefined;
  readonly drawings: () => readonly ShownDrawing[];
  readonly readonly: () => boolean;
  readonly rtl: () => boolean;
  readonly messages: () => NuiSpreadsheetMessages;
  readonly announce: (text: string) => void;
  readonly focus: () => void;
  readonly openSettings: () => void;
  readonly openMenu: (shown: ShownDrawing, event: MouseEvent | undefined) => void;
  readonly editing: SheetEditing;
  readonly table: Readonly<ShallowRef<NuiTableExposed | null>>;
  readonly root: Readonly<ShallowRef<HTMLElement | null>>;
}

export interface DrawingMenuOptions {
  readonly root: Readonly<ShallowRef<HTMLElement | null>>;
  readonly body: Readonly<ShallowRef<HTMLElement | null>>;
  readonly spot: Readonly<ShallowRef<HTMLElement | null>>;
  readonly messages: () => NuiSpreadsheetMessages;
  readonly pressed: () => ShownDrawing | undefined;
  readonly request: (event: MouseEvent, shown: ShownDrawing) => void;
  readonly remove: (shown: ShownDrawing) => void;
  readonly openSettings: (shown: ShownDrawing) => void;
  readonly show: (focus: NuiMenuFocus | undefined) => void;
}

export interface DrawingMenu {
  readonly open: Ref<boolean>;
  readonly anchor: Readonly<ShallowRef<HTMLElement | null>>;
  readonly items: ComputedRef<readonly NuiMenuEntry[]>;
  show(shown: ShownDrawing, event: MouseEvent | undefined): void;
}

export interface InsertSpotOptions {
  readonly cells: () => SheetCells | undefined;
  readonly rtl: () => boolean;
  readonly table: Readonly<ShallowRef<NuiTableExposed | null>>;
  readonly root: Readonly<ShallowRef<HTMLElement | null>>;
}

export interface InsertSpot {
  readonly start: () => CellAddress | undefined;
  readonly end: () => CellAddress | undefined;
  readonly room: () => DrawingSize | undefined;
}

export interface DrawingInsertOptions extends InsertSpotOptions {
  readonly sheet: () => Sheet | undefined;
  readonly readonly: () => boolean;
  readonly messages: () => NuiSpreadsheetMessages;
  readonly refuse: Refuse;
  readonly select: (id: string, name: string) => void;
  readonly editing: SheetEditing;
}

export interface ChartInsertOptions extends DrawingInsertOptions {
  readonly selection: SheetSelection;
}

export interface PictureInsert {
  readonly tools: () => readonly NuiMenuEntry[];
  readonly onPaste: (event: ClipboardEvent) => void;
}

export interface DrawingEdit {
  readonly selectedId: Readonly<ShallowRef<string | undefined>>;
  readonly moving: Readonly<ShallowRef<DrawingMoving | undefined>>;
  readonly dragging: Readonly<ShallowRef<boolean>>;
  readonly editable: ComputedRef<boolean>;
  readonly selected: ComputedRef<ShownDrawing | undefined>;
  select(shown: ShownDrawing): void;
  selectNew(id: string, name: string): void;
  deselect(): void;
  openSettings(shown: ShownDrawing): void;
  remove(shown: ShownDrawing): void;
  pressed(): ShownDrawing | undefined;
  onContextmenu(event: MouseEvent, shown: ShownDrawing): void;
  onDown(event: PointerEvent, shown: ShownDrawing): void;
  onGripDown(event: PointerEvent, shown: ShownDrawing, grip: FrameGrip): void;
  onMove(event: PointerEvent): void;
  onUp(): void;
  onCancel(): void;
  onRootDown(event: PointerEvent): void;
  onKeydown(event: KeyboardEvent): void;
}

export interface ChartSettingsOptions {
  readonly sheet: () => Sheet | undefined;
  readonly selected: () => ShownDrawing | undefined;
  readonly editing: SheetEditing;
  readonly root: Readonly<ShallowRef<HTMLElement | null>>;
  readonly focusPanel: () => void;
  readonly back: () => void;
}

export interface ChartSettings {
  readonly popover: SheetPopover;
  readonly chart: ComputedRef<SheetChart | undefined>;
  readonly placement: Readonly<ShallowRef<FloatingPlacement>>;
  show(): void;
  change(chart: SheetChart): void;
}

export interface ChartSettingsPanelProps {
  readonly chart: SheetChart;
  readonly titleId: string;
  readonly texts: NuiSpreadsheetMessages;
}

export interface ChartSettingsPopoverProps {
  readonly settings: ChartSettings;
  readonly texts: NuiSpreadsheetMessages;
}

export const ShownDrawingKind = {
  Picture: 'picture',
  Chart: 'chart',
  Foreign: 'foreign',
} as const;
