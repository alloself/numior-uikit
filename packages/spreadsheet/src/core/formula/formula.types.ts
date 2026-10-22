import type { CellError, CellRef } from '../cell.types';

export interface FormulaLocale {
  readonly argument: string;
  readonly decimal: string;
  readonly arrayColumn: string;
  readonly arrayRow: string;
  readonly defaultTable: string;
  readonly defaultColumn: string;
}

export interface LineRef {
  readonly index: number;
  readonly absolute: boolean;
}

export type BinaryOperator =
  | '+'
  | '-'
  | '*'
  | '/'
  | '^'
  | '&'
  | '='
  | '<>'
  | '<'
  | '>'
  | '<='
  | '>=';

export type FormulaNode =
  | { readonly kind: 'number'; readonly value: number }
  | { readonly kind: 'string'; readonly value: string }
  | { readonly kind: 'boolean'; readonly value: boolean }
  | { readonly kind: 'error'; readonly code: CellError }
  | { readonly kind: 'cell'; readonly sheet?: string | undefined; readonly ref: CellRef }
  | {
      readonly kind: 'range';
      readonly sheet?: string | undefined;
      readonly from: CellRef;
      readonly to: CellRef;
    }
  | {
      readonly kind: 'columns';
      readonly sheet?: string | undefined;
      readonly from: LineRef;
      readonly to: LineRef;
    }
  | {
      readonly kind: 'rows';
      readonly sheet?: string | undefined;
      readonly from: LineRef;
      readonly to: LineRef;
    }
  | { readonly kind: 'spill'; readonly sheet?: string | undefined; readonly ref: CellRef }
  | { readonly kind: 'name'; readonly sheet?: string | undefined; readonly name: string }
  | { readonly kind: 'call'; readonly name: string; readonly args: readonly FormulaNode[] }
  | { readonly kind: 'unary'; readonly op: '-' | '+'; readonly operand: FormulaNode }
  | { readonly kind: 'percent'; readonly operand: FormulaNode }
  | {
      readonly kind: 'binary';
      readonly op: BinaryOperator;
      readonly left: FormulaNode;
      readonly right: FormulaNode;
    }
  | { readonly kind: 'array'; readonly rows: readonly (readonly FormulaNode[])[] }
  | { readonly kind: 'missing' };

export interface FormulaFailure {
  readonly position: number;
  readonly reason: 'token' | 'end' | 'reference' | 'array';
}

export type FormulaParse =
  | { readonly ok: true; readonly ast: FormulaNode }
  | { readonly ok: false; readonly error: FormulaFailure };
