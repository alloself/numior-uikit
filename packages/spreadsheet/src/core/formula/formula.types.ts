import type { CellError, CellRef } from '../cell.types';
import type { ErrorTexts } from '../error-texts';

export type TokenKind = (typeof TokenKind)[keyof typeof TokenKind];

export type EndpointKind = (typeof EndpointKind)[keyof typeof EndpointKind];

export type StructuredSpecial = (typeof StructuredSpecial)[keyof typeof StructuredSpecial];

export type StructuredArea = (typeof StructuredArea)[keyof typeof StructuredArea];

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

export type BinaryOperator = (typeof BinaryOperator)[keyof typeof BinaryOperator];

export type UnaryOperator = (typeof UnaryOperator)[keyof typeof UnaryOperator];

export type FormulaFailureReason = (typeof FormulaFailureReason)[keyof typeof FormulaFailureReason];

export type BookIndexOf = (name: string) => number | undefined;

export type BookLabelOf = (index: number) => string | undefined;

export interface SheetPlace {
  readonly book?: number | undefined;
  readonly sheet?: string | undefined;
}

export type FormulaNode =
  | { readonly kind: typeof FormulaNodeKind.Number; readonly value: number }
  | { readonly kind: typeof FormulaNodeKind.String; readonly value: string }
  | { readonly kind: typeof FormulaNodeKind.Boolean; readonly value: boolean }
  | {
      readonly kind: typeof FormulaNodeKind.Error;
      readonly code: CellError;
      readonly book?: number | undefined;
      readonly sheet?: string | undefined;
    }
  | {
      readonly kind: typeof FormulaReferenceKind.Cell;
      readonly book?: number | undefined;
      readonly sheet?: string | undefined;
      readonly ref: CellRef;
    }
  | {
      readonly kind: typeof FormulaReferenceKind.Range;
      readonly book?: number | undefined;
      readonly sheet?: string | undefined;
      readonly from: CellRef;
      readonly to: CellRef;
    }
  | {
      readonly kind: typeof FormulaReferenceKind.Columns;
      readonly book?: number | undefined;
      readonly sheet?: string | undefined;
      readonly from: LineRef;
      readonly to: LineRef;
    }
  | {
      readonly kind: typeof FormulaReferenceKind.Rows;
      readonly book?: number | undefined;
      readonly sheet?: string | undefined;
      readonly from: LineRef;
      readonly to: LineRef;
    }
  | {
      readonly kind: typeof FormulaReferenceKind.Spill;
      readonly book?: number | undefined;
      readonly sheet?: string | undefined;
      readonly ref: CellRef;
    }
  | {
      readonly kind: typeof FormulaReferenceKind.Name;
      readonly book?: number | undefined;
      readonly sheet?: string | undefined;
      readonly name: string;
    }
  | {
      readonly kind: typeof FormulaReferenceKind.Structured;
      readonly book?: number | undefined;
      readonly table?: string | undefined;
      readonly area: StructuredArea;
      readonly columns?: StructuredColumns | undefined;
    }
  | {
      readonly kind: typeof FormulaNodeKind.Call;
      readonly name: string;
      readonly args: readonly FormulaNode[];
    }
  | {
      readonly kind: typeof FormulaNodeKind.Unary;
      readonly op: UnaryOperator;
      readonly operand: FormulaNode;
    }
  | { readonly kind: typeof FormulaNodeKind.Percent; readonly operand: FormulaNode }
  | {
      readonly kind: typeof FormulaNodeKind.Binary;
      readonly op: BinaryOperator;
      readonly left: FormulaNode;
      readonly right: FormulaNode;
    }
  | {
      readonly kind: typeof FormulaNodeKind.Array;
      readonly rows: readonly (readonly FormulaNode[])[];
    }
  | { readonly kind: typeof FormulaNodeKind.Missing }
  | { readonly kind: typeof FormulaNodeKind.Opaque; readonly text: string };

export interface FormulaFailure {
  readonly position: number;
  readonly reason: FormulaFailureReason;
  readonly name?: string | undefined;
  readonly argument?: number | undefined;
}

export interface CallSignature {
  readonly min: number;
  readonly max: number;
  readonly counts?: ((count: number) => boolean) | undefined;
  readonly referenceAt?: ((index: number) => boolean) | undefined;
  readonly givesReference?: boolean | undefined;
}

export type SignatureOf = (name: string) => CallSignature | undefined;

export type FormulaParse =
  | { readonly ok: true; readonly ast: FormulaNode }
  | { readonly ok: false; readonly error: FormulaFailure };

export const FormulaFailureReason = {
  Token: 'token',
  End: 'end',
  Reference: 'reference',
  Array: 'array',
  Arguments: 'arguments',
  ReferenceArgument: 'reference-argument',
  LongText: 'long-text',
  BigNumber: 'big-number',
  SmallNumber: 'small-number',
  LongFormula: 'long-formula',
} as const;

export const FormulaReferenceKind = {
  Cell: 'cell',
  Range: 'range',
  Columns: 'columns',
  Rows: 'rows',
  Spill: 'spill',
  Name: 'name',
  Structured: 'structured',
} as const;

export const FormulaNodeKind = {
  Number: 'number',
  String: 'string',
  Boolean: 'boolean',
  Error: 'error',
  ...FormulaReferenceKind,
  Call: 'call',
  Unary: 'unary',
  Percent: 'percent',
  Binary: 'binary',
  Array: 'array',
  Missing: 'missing',
  Opaque: 'opaque',
} as const;

export const StructuredPartKind = { Special: 'special', Columns: 'columns' } as const;

export const StructuredSpecial = {
  All: 'all',
  Data: 'data',
  Headers: 'headers',
  Totals: 'totals',
  Row: 'row',
} as const;

export const StructuredArea = {
  ...StructuredSpecial,
  HeadersData: 'headers-data',
  DataTotals: 'data-totals',
} as const;

export const BinaryOperator = {
  Add: '+',
  Subtract: '-',
  Multiply: '*',
  Divide: '/',
  Power: '^',
  Concat: '&',
  Equal: '=',
  NotEqual: '<>',
  Less: '<',
  Greater: '>',
  LessOrEqual: '<=',
  GreaterOrEqual: '>=',
} as const;

export const UnaryOperator = { Minus: '-', Plus: '+', Intersect: '@' } as const;

export const TokenKind = {
  Number: 'number',
  String: 'string',
  Error: 'error',
  Word: 'word',
  Sheet: 'sheet',
  Structured: 'structured',
  Op: 'op',
  Punct: 'punct',
  Hash: 'hash',
  End: 'end',
} as const;

export const EndpointKind = { Cell: 'cell', Column: 'column', Row: 'row' } as const;

export const FormulaChar = {
  Quote: '"',
  Apostrophe: "'",
  OpenBracket: '[',
  CloseBracket: ']',
  OpenBrace: '{',
  OpenParen: '(',
  CloseParen: ')',
  CloseBrace: '}',
  Equals: '=',
  Hash: '#',
  Bang: '!',
  Dollar: '$',
  Colon: ':',
  Comma: ',',
  Space: ' ',
} as const;

export const FunctionName = { Now: 'NOW', Single: 'SINGLE' } as const;
