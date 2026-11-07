import type { FloatingPlacement } from '@numior/primitives';
import type { NuiTableOverlaySlot, NuiTableRect } from '@numior/table';
import type { NuiMenuEntry } from '@numior/vue';
import type { ComputedRef, Ref, ShallowRef } from 'vue';
import type {
  BookLocale,
  CellValue,
  PivotAggregate,
  PivotArea,
  PivotDefinition,
  PivotLanguage,
  PivotShowAsKind,
  PivotSort,
  PivotSourceField,
  PivotSpot,
  PivotValue,
  Sheet,
  Workbook,
} from '../../core';
import type {
  FormulaBar,
  SheetCells,
  SheetEditing,
  SheetPopover,
  SheetSelection,
} from '../sheet.types';

export interface PivotItemView {
  readonly key: string;
  readonly value: CellValue;
  readonly label: string;
}

export type PivotItemsOf = (field: number) => readonly PivotItemView[] | undefined;

export type PivotFormat = (value: CellValue, code: string) => string;

export interface SheetPivotProps {
  readonly definition: PivotDefinition;
  readonly fields: readonly PivotSourceField[] | undefined;
  readonly titleId: string;
  readonly items: PivotItemsOf;
  readonly format: PivotFormat;
  readonly readonly?: boolean | undefined;
}

export type PivotPanelView =
  | { readonly kind: typeof PivotPanelViewKind.Fields }
  | { readonly kind: typeof PivotPanelViewKind.Items; readonly chip: PivotChip }
  | { readonly kind: typeof PivotPanelViewKind.Value; readonly chip: PivotChip };

export interface SheetPivotItemsProps {
  readonly name: string;
  readonly items: readonly PivotItemView[];
  readonly shown: readonly CellValue[];
  readonly sort: PivotSort | undefined;
}

export interface PivotValueForm {
  readonly name: string;
  readonly aggregate: PivotAggregate;
  readonly showAs: PivotShowAsKind;
  readonly base: number | undefined;
  readonly item: string;
  readonly format: string;
}

export type PivotNameError = (typeof PivotNameError)[keyof typeof PivotNameError];

export interface SheetPivotValueProps {
  readonly value: PivotValue;
  readonly fieldName: string;
  readonly fields: readonly PivotSourceField[];
  readonly bases: readonly number[];
  readonly taken: ReadonlySet<string>;
  readonly items: PivotItemsOf;
  readonly format: PivotFormat;
  readonly language: PivotLanguage;
}

export interface PivotChip {
  readonly key: string;
  readonly spot: PivotSpot;
  readonly field: number;
  readonly label: string;
  readonly values: boolean;
}

export interface PivotAreaView {
  readonly area: PivotArea;
  readonly label: string;
  readonly chips: readonly PivotChip[];
}

export interface PivotFieldView {
  readonly field: number;
  readonly name: string;
  readonly used: boolean;
}

export type PivotDragOrigin =
  | { readonly kind: typeof PivotDragKind.Chip; readonly chip: PivotChip }
  | {
      readonly kind: typeof PivotDragKind.Field;
      readonly field: number;
      readonly label: string;
    };

export type PivotDropTarget =
  | { readonly kind: typeof PivotDropKind.Area; readonly spot: PivotSpot }
  | { readonly kind: typeof PivotDropKind.List };

export type PivotDragState =
  | { readonly phase: typeof PivotDragPhase.Idle }
  | {
      readonly phase: typeof PivotDragPhase.Pending;
      readonly origin: PivotDragOrigin;
      readonly pointerId: number;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly phase: typeof PivotDragPhase.Dragging;
      readonly origin: PivotDragOrigin;
      readonly pointerId: number;
      readonly target: PivotDropTarget | undefined;
    };

export interface PivotDragOptions {
  readonly panel: () => HTMLElement | null;
  readonly ghost: () => HTMLElement | null;
  readonly list: () => HTMLElement | null;
  readonly areas: () => ReadonlyMap<PivotArea, HTMLElement>;
  readonly drop: (origin: PivotDragOrigin, target: PivotDropTarget) => void;
  readonly cancelled: () => void;
}

export interface PivotDrag {
  readonly state: ShallowRef<PivotDragState>;
  readonly dragging: ComputedRef<boolean>;
  onPointerdown(origin: PivotDragOrigin, event: PointerEvent): void;
  onPointermove(event: PointerEvent): void;
  onPointerup(event: PointerEvent): void;
  onClickCapture(event: MouseEvent): void;
  cancel(): void;
}

export interface SheetPivotAreaProps {
  readonly view: PivotAreaView;
  readonly target: number | undefined;
  readonly grabbed: string | undefined;
  readonly readonly: boolean;
  readonly empty: string;
  readonly menuOf: (chip: PivotChip) => readonly NuiMenuEntry[];
  readonly menuLabel: (chip: PivotChip) => string;
}

export interface PivotTarget {
  readonly sheet: Sheet;
  readonly name: string;
}

export interface SheetPivotsOptions {
  readonly book: () => Workbook;
  readonly sheet: () => Sheet | undefined;
  readonly cells: () => SheetCells | undefined;
  readonly selection: SheetSelection;
  readonly editing: SheetEditing;
  readonly formula: FormulaBar;
  readonly sheetIndex: Ref<number>;
  readonly readonly: () => boolean;
  readonly locale: () => BookLocale;
  readonly focusPanel: () => void;
}

export interface SheetPivotPopoverProps {
  readonly pivots: SheetPivots;
  readonly readonly: boolean;
}

export interface SheetPivots {
  readonly popover: SheetPopover;
  readonly definition: ComputedRef<PivotDefinition | undefined>;
  readonly fields: ComputedRef<readonly PivotSourceField[] | undefined>;
  readonly placement: ComputedRef<FloatingPlacement>;
  readonly panel: ComputedRef<PivotDefinition | undefined>;
  readonly items: PivotItemsOf;
  readonly format: PivotFormat;
  tools(): readonly NuiMenuEntry[];
  rect(rectOf: NuiTableOverlaySlot['rectOf']): NuiTableRect | undefined;
  change(definition: PivotDefinition): void;
}

export const PivotDragKind = { Chip: 'chip', Field: 'field' } as const;

export const PivotDropKind = { Area: 'area', List: 'list' } as const;

export const PivotDragPhase = { Idle: 'idle', Pending: 'pending', Dragging: 'dragging' } as const;

export const PivotPanelViewKind = { Fields: 'fields', Items: 'items', Value: 'value' } as const;

export const PivotNameError = { Required: 'required', Taken: 'taken' } as const;
