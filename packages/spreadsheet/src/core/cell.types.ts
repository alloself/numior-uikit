export type UnderlineStyle = (typeof UnderlineStyle)[keyof typeof UnderlineStyle];

export type LineAxis = (typeof LineAxis)[keyof typeof LineAxis];

export type CellError = (typeof CellError)[keyof typeof CellError];

export type CellValue =
  | { readonly kind: typeof CellValueKind.Empty }
  | { readonly kind: typeof CellValueKind.Number; readonly value: number }
  | { readonly kind: typeof CellValueKind.String; readonly value: string }
  | { readonly kind: typeof CellValueKind.Boolean; readonly value: boolean }
  | { readonly kind: typeof CellValueKind.Error; readonly code: CellError };

export interface CellAddress {
  readonly row: number;
  readonly col: number;
}

export interface CellRef extends CellAddress {
  readonly rowAbsolute: boolean;
  readonly colAbsolute: boolean;
}

export interface CellRange {
  readonly top: number;
  readonly left: number;
  readonly bottom: number;
  readonly right: number;
}

export const CellInputKind = { Empty: 'empty', Formula: 'formula', Value: 'value' } as const;

export const CellValueKind = {
  Empty: 'empty',
  Number: 'number',
  String: 'string',
  Boolean: 'boolean',
  Error: 'error',
} as const;

export const StyleColorKind = {
  Rgb: 'rgb',
  Theme: 'theme',
  Indexed: 'indexed',
  Auto: 'auto',
} as const;

export const TableShiftKind = { Same: 'same', Moved: 'moved', Removed: 'removed' } as const;

export const CellError = {
  Null: '#NULL!',
  Div0: '#DIV/0!',
  Value: '#VALUE!',
  Ref: '#REF!',
  Name: '#NAME?',
  Num: '#NUM!',
  Na: '#N/A',
  Spill: '#SPILL!',
  Calc: '#CALC!',
} as const;

export const LineAxis = { Rows: 'rows', Cols: 'cols' } as const;

export const FontScheme = { Major: 'major', Minor: 'minor' } as const;

export const UnderlineStyle = {
  Single: 'single',
  Double: 'double',
  SingleAccounting: 'singleAccounting',
  DoubleAccounting: 'doubleAccounting',
} as const;

export const FillPattern = { None: 'none', Solid: 'solid' } as const;

export const FontScript = { Superscript: 'superscript', Subscript: 'subscript' } as const;

export const BorderLineStyle = { None: 'none' } as const;

export const BooleanText = { True: 'TRUE', False: 'FALSE' } as const;
