import type { RankHost } from './rank-host';

export type SourceHolds = (typeof SourceHolds)[keyof typeof SourceHolds];

export type RankCaseFirst = NonNullable<Intl.CollatorOptions['caseFirst']>;

export type RankSensitivity = NonNullable<Intl.CollatorOptions['sensitivity']>;

export type TableSortDirection = (typeof TableSortDirection)[keyof typeof TableSortDirection];

export interface TableSort {
  readonly key: string;
  readonly direction: TableSortDirection;
}

export type TableTextOp = (typeof TableTextOp)[keyof typeof TableTextOp];

export type TableFilterValue = string | number | boolean | null;

export type TableFilter =
  | {
      readonly kind: typeof TableFilterKind.Text;
      readonly key: string;
      readonly op: TableTextOp;
      readonly value: string;
    }
  | {
      readonly kind: typeof TableFilterKind.Number;
      readonly key: string;
      readonly min?: number | undefined;
      readonly max?: number | undefined;
    }
  | {
      readonly kind: typeof TableFilterKind.Date;
      readonly key: string;
      readonly from?: number | undefined;
      readonly to?: number | undefined;
    }
  | {
      readonly kind: typeof TableFilterKind.Set;
      readonly key: string;
      readonly values: readonly TableFilterValue[];
      readonly exclude?: boolean | undefined;
    }
  | {
      readonly kind: typeof TableFilterKind.Quick;
      readonly value: string;
      readonly keys?: readonly string[] | undefined;
    };

export interface TableQuery {
  readonly sort?: readonly TableSort[] | undefined;
  readonly filters?: readonly TableFilter[] | undefined;
  readonly groupBy?: readonly string[] | undefined;
  readonly totals?: boolean | undefined;
}

export type TableAggregateKind = (typeof TableAggregateKind)[keyof typeof TableAggregateKind];

export type TableAggregateFn<T> = (rows: readonly T[], indices: Uint32Array) => unknown;

export type TableAggregate<T> = TableAggregateKind | TableAggregateFn<T>;

interface TableColumnBase<T> {
  readonly key: string;
  readonly aggregate?: TableAggregate<T> | undefined;
}

export type TableEngineColumn<T> =
  | (TableColumnBase<T> & {
      readonly kind: typeof TableEngineColumnKind.Number;
      readonly value: (row: T) => number | null | undefined;
    })
  | (TableColumnBase<T> & {
      readonly kind: typeof TableEngineColumnKind.Boolean;
      readonly value: (row: T) => boolean | null | undefined;
    })
  | (TableColumnBase<T> & {
      readonly kind: typeof TableEngineColumnKind.Date;
      readonly value: (row: T) => Date | number | null | undefined;
    })
  | (TableColumnBase<T> & {
      readonly kind: typeof TableEngineColumnKind.String;
      readonly value: (row: T) => string | null | undefined;
    });

export interface StringCodes {
  readonly codes: Uint32Array;
  readonly nulls: Uint8Array;
  readonly dictionary: readonly string[];
}

export type ColumnStore =
  | {
      readonly kind: typeof ColumnStoreKind.Number;
      readonly keys: Float64Array;
      readonly nulls: Uint8Array;
    }
  | (StringCodes & { readonly kind: typeof ColumnStoreKind.Codes })
  | (StringCodes & {
      readonly kind: typeof ColumnStoreKind.String;
      readonly ranks: Uint32Array;
      readonly sortedCodes: Uint32Array;
    });

export type RankedStore = Exclude<ColumnStore, { kind: 'codes' }>;

export type StoreNeed = (typeof StoreNeed)[keyof typeof StoreNeed];

export interface TableStoreWish {
  readonly key: string;
  readonly need: StoreNeed;
}

export interface TablePrepareOptions {
  readonly sliceMs?: number | undefined;
  readonly yieldTo?: (() => Promise<void>) | undefined;
  readonly signal?: AbortSignal | undefined;
}

export type TablePhase = (typeof TablePhase)[keyof typeof TablePhase];

export interface TableProgress {
  readonly phase: TablePhase;
  readonly done: number;
  readonly total: number;
}

export type TableRunResult =
  | { readonly kind: typeof TableRunResultKind.Done; readonly count: number; readonly rows: number }
  | { readonly kind: typeof TableRunResultKind.Cancelled };

export interface TableRunOptions {
  readonly signal?: AbortSignal | undefined;
  readonly yieldTo?: (() => Promise<void>) | undefined;
  readonly onProgress?: ((progress: TableProgress) => void) | undefined;
}

export type TableNodeId = string | number;

export interface TableRowNode<T> {
  readonly kind: typeof TableNodeKind.Row;
  readonly id: TableNodeId;
  readonly index: number;
  readonly row: T;
  readonly level: number;
  readonly expandable: boolean;
  readonly expanded: boolean;
  readonly unloaded: boolean;
  readonly loading: boolean;
}

export interface TableGroupNode {
  readonly kind: typeof TableNodeKind.Group;
  readonly id: string;
  readonly key: string;
  readonly value: unknown;
  readonly path: readonly unknown[];
  readonly level: number;
  readonly count: number;
  readonly expanded: boolean;
  readonly aggregates: Readonly<Record<string, unknown>>;
}

export interface TableDetailNode<T> {
  readonly kind: typeof TableNodeKind.Detail;
  readonly id: TableNodeId;
  readonly row: T;
  readonly level: number;
}

export type TableNode<T> = TableRowNode<T> | TableGroupNode | TableDetailNode<T>;

export interface TableSiblings<T> {
  readonly index: number;
  readonly count: number;
  readonly parentIndex: number;
  readonly parent: T | undefined;
}

export interface TableDistinctOptions {
  readonly limit?: number | undefined;
  readonly search?: string | undefined;
  readonly text?: ((value: TableFilterValue) => string) | undefined;
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
  readonly detail?: ((row: T) => boolean) | undefined;
  readonly defaultExpanded?: boolean | undefined;
  readonly collator?: Intl.Collator | undefined;
  readonly sliceMs?: number | undefined;
  readonly yieldTo?: (() => Promise<void>) | undefined;
  readonly rankHost?: RankHost | undefined;
}

export type TableNodePosition = readonly [id: TableNodeId, position: number];

export interface TableEngine<T> {
  count(): number;
  rowCount(): number;
  setRows(rows: readonly T[]): void;
  run(query: TableQuery, options?: TableRunOptions): Promise<TableRunResult>;
  runSync(query: TableQuery): TableRunResult;
  patch(query: TableQuery, keys: readonly string[], rows?: readonly T[]): void;
  visibleIndices(): Uint32Array;
  nodeAt(position: number): TableNode<T> | undefined;
  positionsOf(matches: (id: TableNodeId) => boolean, limit: number): TableNodePosition[];
  details(): readonly number[];
  siblingsAt(position: number): TableSiblings<T> | undefined;
  rowAt(index: number): T | undefined;
  toggle(position: number): void;
  setExpanded(id: TableNodeId, expanded: boolean): void;
  setToggled(ids: Iterable<TableNodeId>): void;
  isExpanded(id: TableNodeId): boolean;
  totals(): Readonly<Record<string, unknown>>;
  distinct(key: string, options?: TableDistinctOptions): Promise<TableDistinct | null>;
  store(key: string): ColumnStore | undefined;
  prepare(wishes: readonly TableStoreWish[], options?: TablePrepareOptions): Promise<boolean>;
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
  readonly search: string;
  readonly signal: AbortSignal;
}

export interface TableTotalsRequest {
  readonly filters: readonly TableFilter[];
  readonly signal: AbortSignal;
}

export interface TableChildrenRequest<T> {
  readonly row: T;
  readonly sort: readonly TableSort[];
  readonly filters: readonly TableFilter[];
  readonly signal: AbortSignal;
}

export interface TableSource<T> {
  readonly fetch: (request: TableFetchRequest) => Promise<TableFetchResult<T>>;
  readonly children?: ((request: TableChildrenRequest<T>) => Promise<readonly T[]>) | undefined;
  readonly values?: ((request: TableValuesRequest) => Promise<TableDistinct>) | undefined;
  readonly totals?:
    | ((request: TableTotalsRequest) => Promise<Readonly<Record<string, unknown>>>)
    | undefined;
}

export interface TableSourceEngineOptions<T> {
  readonly source: TableSource<T>;
  readonly keyOf?: ((row: T) => TableNodeId) | undefined;
  readonly hasChildren?: ((row: T) => boolean) | undefined;
  readonly detail?: ((row: T) => boolean) | undefined;
  readonly blockSize: () => number;
  readonly cacheBlocks?: number | undefined;
  readonly concurrency?: number | undefined;
  readonly onChange: () => void;
  readonly onError: (error: unknown) => void;
}

export const TableSortDirection = { Asc: 'asc', Desc: 'desc' } as const;

export const TableTextOp = {
  Contains: 'contains',
  Equals: 'equals',
  Starts: 'starts',
  Empty: 'empty',
} as const;

export const TableAggregateKind = {
  Sum: 'sum',
  Count: 'count',
  Avg: 'avg',
  Min: 'min',
  Max: 'max',
} as const;

export const StoreNeed = { Codes: 'codes', Ranks: 'ranks' } as const;

export const TablePhase = { Keys: 'keys', Filter: 'filter', Sort: 'sort', Group: 'group' } as const;

export const SourceHolds = { Rows: 'rows', Groups: 'groups', Detail: 'detail' } as const;

export const CollationStage = { Pack: 'pack', Wait: 'wait', Local: 'local', Done: 'done' } as const;

export const TableFilterKind = {
  Text: 'text',
  Number: 'number',
  Date: 'date',
  Set: 'set',
  Quick: 'quick',
} as const;

export const TableEngineColumnKind = {
  Number: 'number',
  Boolean: 'boolean',
  Date: 'date',
  String: 'string',
} as const;

export const ColumnStoreKind = { Number: 'number', Codes: 'codes', String: 'string' } as const;

export const TableRunResultKind = { Done: 'done', Cancelled: 'cancelled' } as const;

export const TableNodeKind = { Row: 'row', Group: 'group', Detail: 'detail' } as const;

export const DictionaryScanKind = { Lowered: 'lowered', Exact: 'exact' } as const;

export const RadixLaneKind = { Float: 'float', Rank: 'rank' } as const;

export const RadixGroupKind = { Float: 'float', Packed: 'packed' } as const;

export const RankMessageKind = { Part: 'part', Sort: 'sort', Drop: 'drop' } as const;

export const ErrorName = { Abort: 'AbortError' } as const;
