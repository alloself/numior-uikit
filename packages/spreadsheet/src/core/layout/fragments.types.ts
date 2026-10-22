import type { CellAddress, CellRange } from '../cell.types';
import type { FormulaNode } from '../formula/formula.types';

export type SlotPolicy = 'drop' | 'clamp' | 'follow';

export type SlotAxis = 'rows' | 'cols';

export type FragmentSlot =
  | { readonly kind: 'cell'; readonly cell: CellAddress; readonly policy: SlotPolicy }
  | {
      readonly kind: 'ranges';
      readonly ranges: readonly CellRange[];
      readonly policy: SlotPolicy;
    }
  | {
      readonly kind: 'line';
      readonly axis: SlotAxis;
      readonly line: number;
      readonly base: number;
      readonly policy: SlotPolicy;
    }
  | { readonly kind: 'split'; readonly axis: SlotAxis; readonly count: number }
  | { readonly kind: 'offset'; readonly offset: number }
  | { readonly kind: 'formula'; readonly ast: FormulaNode }
  | { readonly kind: 'count' };

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
