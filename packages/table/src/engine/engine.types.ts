export type TableSortDirection = 'asc' | 'desc';

export interface TableSort {
  readonly key: string;
  readonly direction: TableSortDirection;
}

export type TableTextOp = 'contains' | 'equals' | 'starts' | 'empty';

export type TableFilterValue = string | number | boolean | null;

export type TableFilter =
  | {
      readonly kind: 'text';
      readonly key: string;
      readonly op: TableTextOp;
      readonly value: string;
    }
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
  | { readonly kind: 'set'; readonly key: string; readonly values: readonly TableFilterValue[] }
  | {
      readonly kind: 'quick';
      readonly value: string;
      readonly keys?: readonly string[] | undefined;
    };

export interface TableQuery {
  readonly sort?: readonly TableSort[] | undefined;
  readonly filters?: readonly TableFilter[] | undefined;
  readonly groupBy?: readonly string[] | undefined;
  readonly totals?: boolean | undefined;
}

export type TableAggregateKind = 'sum' | 'count' | 'avg' | 'min' | 'max';

export type TableAggregateFn<T> = (rows: readonly T[], indices: Uint32Array) => unknown;

export type TableAggregate<T> = TableAggregateKind | TableAggregateFn<T>;

interface TableColumnBase<T> {
  readonly key: string;
  readonly aggregate?: TableAggregate<T> | undefined;
}

export type TableEngineColumn<T> =
  | (TableColumnBase<T> & {
      readonly kind: 'number';
      readonly value: (row: T) => number | null | undefined;
    })
  | (TableColumnBase<T> & {
      readonly kind: 'boolean';
      readonly value: (row: T) => boolean | null | undefined;
    })
  | (TableColumnBase<T> & {
      readonly kind: 'date';
      readonly value: (row: T) => Date | number | null | undefined;
    })
  | (TableColumnBase<T> & {
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

export type TablePhase = 'keys' | 'filter' | 'sort' | 'group';

export interface TableProgress {
  readonly phase: TablePhase;
  readonly done: number;
  readonly total: number;
}

export type TableRunResult =
  | { readonly kind: 'done'; readonly count: number; readonly rows: number }
  | { readonly kind: 'cancelled' };

export interface TableRunOptions {
  readonly signal?: AbortSignal | undefined;
  readonly onProgress?: ((progress: TableProgress) => void) | undefined;
}

export type TableNodeId = string | number;

export interface TableRowNode<T> {
  readonly kind: 'row';
  readonly id: TableNodeId;
  readonly index: number;
  readonly row: T;
  readonly level: number;
  readonly expandable: boolean;
  readonly expanded: boolean;
  readonly unloaded: boolean;
}

export interface TableGroupNode {
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

export type TableNode<T> = TableRowNode<T> | TableGroupNode;

export interface TableSiblings<T> {
  readonly index: number;
  readonly count: number;
  readonly parentIndex: number;
  readonly parent: T | undefined;
}

export interface TableDistinctOptions {
  readonly limit?: number | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface TableDistinct {
  readonly values: readonly TableFilterValue[];
  readonly truncated: boolean;
}

export interface TableEngineOptions<T> {
  readonly columns: readonly TableEngineColumn<T>[];
  readonly keyOf?: ((row: T) => TableNodeId) | undefined;
  readonly children?: ((row: T) => readonly T[] | null | undefined) | undefined;
  readonly hasChildren?: ((row: T) => boolean) | undefined;
  readonly defaultExpanded?: boolean | undefined;
  readonly collator?: Intl.Collator | undefined;
  readonly sliceMs?: number | undefined;
  readonly yieldTo?: (() => Promise<void>) | undefined;
}

export interface TableEngine<T> {
  count(): number;
  rowCount(): number;
  setRows(rows: readonly T[]): void;
  run(query: TableQuery, options?: TableRunOptions): Promise<TableRunResult>;
  runSync(query: TableQuery): TableRunResult;
  patch(query: TableQuery, keys: readonly string[]): void;
  visibleIndices(): Uint32Array;
  nodeAt(position: number): TableNode<T> | undefined;
  siblingsAt(position: number): TableSiblings<T> | undefined;
  rowAt(index: number): T | undefined;
  toggle(position: number): void;
  setExpanded(id: TableNodeId, expanded: boolean): void;
  setToggled(ids: Iterable<TableNodeId>): void;
  isExpanded(id: TableNodeId): boolean;
  totals(): Readonly<Record<string, unknown>>;
  distinct(key: string, options?: TableDistinctOptions): Promise<TableDistinct | null>;
  store(key: string): ColumnStore | undefined;
  pendingAt(position: number): boolean;
  collect(signal?: AbortSignal): Promise<readonly T[]>;
  ensure(from: number, to: number): void;
  refresh(): void;
  settled(): boolean;
  dispose(): void;
}

export interface TableFetchRequest {
  readonly offset: number;
  readonly limit: number;
  readonly sort: readonly TableSort[];
  readonly filters: readonly TableFilter[];
  readonly groupBy: readonly string[];
  readonly groupPath: readonly unknown[];
  readonly signal: AbortSignal;
}

export interface TableSourceGroup {
  readonly value: unknown;
  readonly count: number;
  readonly aggregates?: Readonly<Record<string, unknown>> | undefined;
}

export interface TableRowsResult<T> {
  readonly rows: readonly T[];
  readonly total?: number | undefined;
  readonly hasMore?: boolean | undefined;
}

export interface TableGroupsResult {
  readonly groups: readonly TableSourceGroup[];
  readonly total?: number | undefined;
  readonly hasMore?: boolean | undefined;
}

export type TableFetchResult<T> = TableRowsResult<T> | TableGroupsResult;

export interface TableValuesRequest {
  readonly key: string;
  readonly filters: readonly TableFilter[];
  readonly limit: number;
  readonly signal: AbortSignal;
}

export interface TableTotalsRequest {
  readonly filters: readonly TableFilter[];
  readonly signal: AbortSignal;
}

export interface TableSource<T> {
  readonly fetch: (request: TableFetchRequest) => Promise<TableFetchResult<T>>;
  readonly values?: ((request: TableValuesRequest) => Promise<TableDistinct>) | undefined;
  readonly totals?:
    | ((request: TableTotalsRequest) => Promise<Readonly<Record<string, unknown>>>)
    | undefined;
}

export interface TableSourceEngineOptions<T> {
  readonly source: TableSource<T>;
  readonly keyOf?: ((row: T) => TableNodeId) | undefined;
  readonly blockSize: () => number;
  readonly cacheBlocks?: number | undefined;
  readonly concurrency?: number | undefined;
  readonly onChange: () => void;
  readonly onError: (error: unknown) => void;
}
