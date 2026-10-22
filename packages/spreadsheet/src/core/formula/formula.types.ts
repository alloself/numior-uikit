import type { CellError, CellRef } from '../cell.types';
import type { ErrorTexts } from '../error-texts';

export type StructuredSpecial = 'all' | 'data' | 'headers' | 'totals' | 'row';

export type StructuredArea =
  | 'data'
  | 'all'
  | 'headers'
  | 'totals'
  | 'headers-data'
  | 'data-totals'
  | 'row';

export interface StructuredColumns {
  readonly from: string;
  readonly to: string;
}

export interface FormulaLocale {
  readonly argument: string;
  readonly decimal: string;
  readonly arrayColumn: string;
  readonly arrayRow: string;
  readonly defaultTable: string;
  readonly defaultColumn: string;
  readonly specials: Readonly<Record<StructuredSpecial, string>>;
  readonly functions: Readonly<Record<string, string>>;
  readonly trueText: string;
  readonly falseText: string;
  readonly errors: ErrorTexts;
  readonly rowShorthand: boolean;
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

export interface SheetPlace {
  readonly book?: number | undefined;
  readonly sheet?: string | undefined;
}

export type FormulaNode =
  | { readonly kind: 'number'; readonly value: number }
  | { readonly kind: 'string'; readonly value: string }
  | { readonly kind: 'boolean'; readonly value: boolean }
  | { readonly kind: 'error'; readonly code: CellError }
  | {
      readonly kind: 'cell';
      readonly book?: number | undefined;
      readonly sheet?: string | undefined;
      readonly ref: CellRef;
    }
  | {
      readonly kind: 'range';
      readonly book?: number | undefined;
      readonly sheet?: string | undefined;
      readonly from: CellRef;
      readonly to: CellRef;
    }
  | {
      readonly kind: 'columns';
      readonly book?: number | undefined;
      readonly sheet?: string | undefined;
      readonly from: LineRef;
      readonly to: LineRef;
    }
  | {
      readonly kind: 'rows';
      readonly book?: number | undefined;
      readonly sheet?: string | undefined;
      readonly from: LineRef;
      readonly to: LineRef;
    }
  | {
      readonly kind: 'spill';
      readonly book?: number | undefined;
      readonly sheet?: string | undefined;
      readonly ref: CellRef;
    }
  | {
      readonly kind: 'name';
      readonly book?: number | undefined;
      readonly sheet?: string | undefined;
      readonly name: string;
    }
  | {
      readonly kind: 'structured';
      readonly table?: string | undefined;
      readonly area: StructuredArea;
      readonly columns?: StructuredColumns | undefined;
    }
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
