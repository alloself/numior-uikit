import type { CellAddress, CellRange, CellValue } from '../cell.types';

export type PivotSource =
  | { readonly kind: 'range'; readonly sheet: string; readonly range: CellRange }
  | { readonly kind: 'table'; readonly name: string }
  | { readonly kind: 'lost' };

export type PivotAggregate =
  | 'sum'
  | 'count'
  | 'average'
  | 'max'
  | 'min'
  | 'product'
  | 'countNums'
  | 'stdDev'
  | 'stdDevp'
  | 'var'
  | 'varp';

export type PivotBaseItem = 'previous' | 'next' | CellValue;

export type PivotShowAs =
  | { readonly kind: 'normal' }
  | { readonly kind: 'percentOfTotal' | 'percentOfRow' | 'percentOfCol' | 'index' }
  | { readonly kind: 'runTotal'; readonly field: number }
  | {
      readonly kind: 'difference' | 'percent' | 'percentDiff';
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

export type PivotSort = 'manual' | 'ascending' | 'descending';

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

export type PivotLayout = 'compact' | 'outline' | 'tabular';

export type PivotLanguage = 'en' | 'ru';

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

export type PivotLineKind = 'item' | 'group' | 'subtotal' | 'grand';

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
