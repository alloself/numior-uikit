export type GridSortDirection = 'asc' | 'desc';

export interface GridSort {
  readonly key: string;
  readonly direction: GridSortDirection;
}

export type GridTextOp = 'contains' | 'equals' | 'starts' | 'empty';

export type GridFilterValue = string | number | boolean | null;

export type GridFilter =
  | { readonly kind: 'text'; readonly key: string; readonly op: GridTextOp; readonly value: string }
  | {
      readonly kind: 'number';
      readonly key: string;
      readonly min?: number | undefined;
      readonly max?: number | undefined;
    }
  | {
      readonly kind: 'date';
      readonly key: string;
      readonly from?: number | undefined;
      readonly to?: number | undefined;
    }
  | { readonly kind: 'set'; readonly key: string; readonly values: readonly GridFilterValue[] }
  | { readonly kind: 'quick'; readonly value: string };

export interface GridQuery {
  readonly sort?: readonly GridSort[] | undefined;
  readonly filters?: readonly GridFilter[] | undefined;
  readonly groupBy?: readonly string[] | undefined;
  readonly totals?: boolean | undefined;
}

export type GridAggregateKind = 'sum' | 'count' | 'avg' | 'min' | 'max';

export type GridAggregateFn<T> = (rows: readonly T[], indices: Uint32Array) => unknown;

export type GridAggregate<T> = GridAggregateKind | GridAggregateFn<T>;

interface GridColumnBase<T> {
  readonly key: string;
  readonly aggregate?: GridAggregate<T> | undefined;
}

export type GridEngineColumn<T> =
  | (GridColumnBase<T> & {
      readonly kind: 'number';
      readonly value: (row: T) => number | null | undefined;
    })
  | (GridColumnBase<T> & {
      readonly kind: 'boolean';
      readonly value: (row: T) => boolean | null | undefined;
    })
  | (GridColumnBase<T> & {
      readonly kind: 'date';
      readonly value: (row: T) => Date | number | null | undefined;
    })
  | (GridColumnBase<T> & {
      readonly kind: 'string';
      readonly value: (row: T) => string | null | undefined;
    });

export interface StringCodes {
  readonly codes: Uint32Array;
  readonly nulls: Uint8Array;
  readonly dictionary: readonly string[];
}

export type ColumnStore =
  | {
      readonly kind: 'number';
      readonly keys: Float64Array;
      readonly nulls: Uint8Array;
    }
  | (StringCodes & { readonly kind: 'codes' })
  | (StringCodes & {
      readonly kind: 'string';
      readonly ranks: Uint32Array;
      readonly sortedCodes: Uint32Array;
    });

export type RankedStore = Exclude<ColumnStore, { kind: 'codes' }>;

export type StoreNeed = 'codes' | 'ranks';

export type GridPhase = 'keys' | 'filter' | 'sort' | 'group';

export interface GridProgress {
  readonly phase: GridPhase;
  readonly done: number;
  readonly total: number;
}

export type GridRunResult =
  | { readonly kind: 'done'; readonly count: number; readonly rows: number }
  | { readonly kind: 'cancelled' };

export interface GridRunOptions {
  readonly signal?: AbortSignal | undefined;
  readonly onProgress?: ((progress: GridProgress) => void) | undefined;
}

export type GridNodeId = string | number;

export interface GridRowNode<T> {
  readonly kind: 'row';
  readonly id: GridNodeId;
  readonly index: number;
  readonly row: T;
  readonly level: number;
  readonly expandable: boolean;
  readonly expanded: boolean;
}

export interface GridGroupNode {
  readonly kind: 'group';
  readonly id: string;
  readonly key: string;
  readonly value: unknown;
  readonly path: readonly unknown[];
  readonly level: number;
  readonly count: number;
  readonly expanded: boolean;
  readonly aggregates: Readonly<Record<string, unknown>>;
}

export type GridNode<T> = GridRowNode<T> | GridGroupNode;

export interface GridDistinctOptions {
  readonly limit?: number | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface GridDistinct {
  readonly values: readonly GridFilterValue[];
  readonly truncated: boolean;
}

export interface GridEngineOptions<T> {
  readonly columns: readonly GridEngineColumn<T>[];
  readonly keyOf?: ((row: T) => GridNodeId) | undefined;
  readonly children?: ((row: T) => readonly T[] | null | undefined) | undefined;
  readonly defaultExpanded?: boolean | undefined;
  readonly collator?: Intl.Collator | undefined;
  readonly sliceMs?: number | undefined;
  readonly yieldTo?: (() => Promise<void>) | undefined;
}

export interface GridEngine<T> {
  count(): number;
  rowCount(): number;
  setRows(rows: readonly T[]): void;
  run(query: GridQuery, options?: GridRunOptions): Promise<GridRunResult>;
  runSync(query: GridQuery): GridRunResult;
  visibleIndices(): Uint32Array;
  nodeAt(position: number): GridNode<T> | undefined;
  rowAt(index: number): T | undefined;
  toggle(position: number): void;
  setExpanded(id: GridNodeId, expanded: boolean): void;
  isExpanded(id: GridNodeId): boolean;
  totals(): Readonly<Record<string, unknown>>;
  distinct(key: string, options?: GridDistinctOptions): Promise<GridDistinct | null>;
  store(key: string): ColumnStore | undefined;
  dispose(): void;
}
