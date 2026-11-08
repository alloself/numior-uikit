import type { CellAddress, CellRange, LineAxis } from '../cell.types';
import type { FormulaNode } from '../formula/formula.types';

export type SlotPolicy = (typeof SlotPolicy)[keyof typeof SlotPolicy];

export type MeasureName = (typeof MeasureName)[keyof typeof MeasureName];

export type FragmentSlot =
  | {
      readonly kind: typeof FragmentSlotKind.Cell;
      readonly cell: CellAddress;
      readonly policy: SlotPolicy;
    }
  | {
      readonly kind: typeof FragmentSlotKind.Ranges;
      readonly ranges: readonly CellRange[];
      readonly policy: SlotPolicy;
    }
  | {
      readonly kind: typeof FragmentSlotKind.Line;
      readonly axis: LineAxis;
      readonly line: number;
      readonly base: number;
      readonly policy: SlotPolicy;
    }
  | {
      readonly kind: typeof FragmentSlotKind.Split;
      readonly axis: LineAxis;
      readonly count: number;
    }
  | { readonly kind: typeof FragmentSlotKind.Offset; readonly offset: number }
  | {
      readonly kind: typeof FragmentSlotKind.Measure;
      readonly name: MeasureName;
      readonly value: number;
    }
  | { readonly kind: typeof FragmentSlotKind.Formula; readonly ast: FormulaNode }
  | { readonly kind: typeof FragmentSlotKind.Count };

export type FragmentPiece = string | FragmentSlot | Fragment;

export interface Fragment {
  readonly pieces: readonly FragmentPiece[];
  readonly group: boolean;
}

export interface SheetXml {
  readonly head: Fragment;
  readonly tail: Fragment;
  readonly opaque: readonly string[];
}

export interface PartXml {
  readonly path: string;
  readonly root: Fragment;
  readonly opaque: readonly string[];
}

export const FragmentSlotKind = {
  Cell: 'cell',
  Ranges: 'ranges',
  Line: 'line',
  Split: 'split',
  Offset: 'offset',
  Measure: 'measure',
  Formula: 'formula',
  Count: 'count',
} as const;

export const SlotPolicy = {
  Drop: 'drop',
  Clamp: 'clamp',
  Follow: 'follow',
  Fixed: 'fixed',
} as const;

export const MeasureName = {
  ColOff: 'colOff',
  RowOff: 'rowOff',
  Width: 'cx',
  Height: 'cy',
  X: 'x',
  Y: 'y',
} as const;
