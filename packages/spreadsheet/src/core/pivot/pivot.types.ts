import type { CellAddress, CellRange, CellValue } from '../cell.types';

export type PivotSource =
  | {
      readonly kind: typeof PivotSourceKind.Range;
      readonly sheet: string;
      readonly range: CellRange;
    }
  | { readonly kind: typeof PivotSourceKind.Table; readonly name: string }
  | { readonly kind: typeof PivotSourceKind.Lost };

export type PivotAggregate = (typeof PivotAggregate)[keyof typeof PivotAggregate];

export type PivotShowAsKind = (typeof PivotShowAsKind)[keyof typeof PivotShowAsKind];

export type PivotBaseItem = typeof PivotBaseStep.Previous | typeof PivotBaseStep.Next | CellValue;

export type PivotShowAs =
  | { readonly kind: typeof PivotShowAsKind.Normal }
  | {
      readonly kind:
        | typeof PivotShowAsKind.PercentOfTotal
        | typeof PivotShowAsKind.PercentOfRow
        | typeof PivotShowAsKind.PercentOfCol
        | typeof PivotShowAsKind.Index;
    }
  | { readonly kind: typeof PivotShowAsKind.RunTotal; readonly field: number }
  | {
      readonly kind:
        | typeof PivotShowAsKind.Difference
        | typeof PivotShowAsKind.Percent
        | typeof PivotShowAsKind.PercentDiff;
      readonly field: number;
      readonly item: PivotBaseItem;
    };

export interface PivotValue {
  readonly field: number;
  readonly aggregate: PivotAggregate;
  readonly name: string;
  readonly showAs: PivotShowAs;
  readonly format: string | undefined;
}

export type PivotSort = (typeof PivotSort)[keyof typeof PivotSort];

export interface PivotField {
  readonly order: readonly CellValue[];
  readonly hidden: readonly CellValue[];
  readonly sort: PivotSort;
  readonly subtotal: boolean;
}

export interface PivotFilter {
  readonly field: number;
  readonly selected: CellValue | undefined;
}

export type PivotLayout = (typeof PivotLayout)[keyof typeof PivotLayout];

export type PivotLanguage = (typeof PivotLanguage)[keyof typeof PivotLanguage];

export interface PivotCaptions {
  readonly rows: string;
  readonly columns: string;
  readonly values: string;
  readonly total: string;
  readonly grandTotal: string;
  readonly blank: string;
  readonly all: string;
  readonly multiple: string;
}

export interface PivotDefinition {
  readonly source: PivotSource;
  readonly rows: readonly number[];
  readonly columns: readonly number[];
  readonly filters: readonly PivotFilter[];
  readonly values: readonly PivotValue[];
  readonly fields: readonly PivotField[];
  readonly layout: PivotLayout;
  readonly rowTotals: boolean;
  readonly columnTotals: boolean;
  readonly autofit: boolean;
  readonly captions: PivotCaptions;
}

export interface PivotTable {
  readonly header: readonly CellValue[];
  readonly columns: readonly (readonly CellValue[])[];
  readonly count: number;
}

export interface PivotGroup {
  readonly items: readonly CellValue[];
  readonly records: Int32Array;
}

export interface PivotCacheField {
  readonly name: string;
  readonly values: readonly CellValue[];
}

export interface PivotCache {
  readonly fields: readonly PivotCacheField[];
  readonly count: number;
  group(field: number): PivotGroup | undefined;
}

export type PivotLineKind = (typeof PivotLineKind)[keyof typeof PivotLineKind];

export interface PivotLine {
  readonly kind: PivotLineKind;
  readonly items: readonly number[];
  readonly depth: number;
  readonly node: number;
  readonly value: number;
  readonly shows: boolean;
}

export interface PivotResult {
  readonly rows: readonly PivotLine[];
  readonly columns: readonly PivotLine[];
  readonly cells: readonly (readonly CellValue[])[];
}

export interface PivotCell {
  readonly row: number;
  readonly col: number;
  readonly value: CellValue;
  readonly format: string | undefined;
}

export interface PivotOutput {
  readonly cells: readonly PivotCell[];
  readonly size: CellAddress;
  readonly firstHeaderRow: number;
  readonly firstDataRow: number;
  readonly firstDataCol: number;
  readonly pageRows: number;
  readonly width: number;
}

export interface PivotSpec {
  readonly anchor: CellAddress;
  readonly definition: PivotDefinition;
}

export interface PivotState extends PivotSpec {
  readonly footprint: CellRange | undefined;
}

export type PivotArea = (typeof PivotArea)[keyof typeof PivotArea];

export interface PivotSpot {
  readonly area: PivotArea;
  readonly index: number;
}

export interface PivotSourceField {
  readonly name: string;
  readonly numeric: boolean;
}

export interface PivotPlacement {
  readonly fields: readonly PivotSourceField[];
  readonly language: PivotLanguage;
}

export const PivotSourceKind = { Range: 'range', Table: 'table', Lost: 'lost' } as const;

export const PivotAggregate = {
  Sum: 'sum',
  Count: 'count',
  Average: 'average',
  Max: 'max',
  Min: 'min',
  Product: 'product',
  CountNums: 'countNums',
  StdDev: 'stdDev',
  StdDevp: 'stdDevp',
  Var: 'var',
  Varp: 'varp',
} as const;

export const PivotSort = {
  Manual: 'manual',
  Ascending: 'ascending',
  Descending: 'descending',
} as const;

export const PivotLayout = { Compact: 'compact', Outline: 'outline', Tabular: 'tabular' } as const;

export const PivotLanguage = { En: 'en', Ru: 'ru' } as const;

export const PivotLineKind = {
  Item: 'item',
  Group: 'group',
  Subtotal: 'subtotal',
  Grand: 'grand',
} as const;

export const PivotArea = {
  Filters: 'filters',
  Columns: 'columns',
  Rows: 'rows',
  Values: 'values',
} as const;

export const PivotBaseStep = { Previous: 'previous', Next: 'next' } as const;

export const PivotShowAsKind = {
  Normal: 'normal',
  PercentOfTotal: 'percentOfTotal',
  PercentOfRow: 'percentOfRow',
  PercentOfCol: 'percentOfCol',
  Index: 'index',
  RunTotal: 'runTotal',
  Difference: 'difference',
  Percent: 'percent',
  PercentDiff: 'percentDiff',
} as const;
