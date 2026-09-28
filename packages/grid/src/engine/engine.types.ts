export type GridSortDirection = 'asc' | 'desc';

export interface GridSort {
  readonly key: string;
  readonly direction: GridSortDirection;
}

export interface GridQuery {
  readonly sort: readonly GridSort[];
}

export type GridEngineColumn<T> =
  | {
      readonly kind: 'number';
      readonly key: string;
      readonly value: (row: T) => number | null | undefined;
    }
  | {
      readonly kind: 'boolean';
      readonly key: string;
      readonly value: (row: T) => boolean | null | undefined;
    }
  | {
      readonly kind: 'date';
      readonly key: string;
      readonly value: (row: T) => Date | number | null | undefined;
    }
  | {
      readonly kind: 'string';
      readonly key: string;
      readonly value: (row: T) => string | null | undefined;
    };

export type ColumnStore =
  | {
      readonly kind: 'number';
      readonly keys: Float64Array;
      readonly nulls: Uint8Array;
    }
  | {
      readonly kind: 'string';
      readonly ranks: Uint32Array;
      readonly nulls: Uint8Array;
      readonly dictionary: readonly string[];
    };

export type GridPhase = 'keys' | 'sort';

export interface GridProgress {
  readonly phase: GridPhase;
  readonly done: number;
  readonly total: number;
}

export type GridRunResult =
  | { readonly kind: 'done'; readonly count: number }
  | { readonly kind: 'cancelled' };

export interface GridRunOptions {
  readonly signal?: AbortSignal | undefined;
  readonly onProgress?: ((progress: GridProgress) => void) | undefined;
}

export interface GridRowNode<T> {
  readonly kind: 'row';
  readonly index: number;
  readonly row: T;
  readonly level: number;
}

export type GridNode<T> = GridRowNode<T>;

export interface GridEngineOptions<T> {
  readonly columns: readonly GridEngineColumn<T>[];
  readonly collator?: Intl.Collator | undefined;
  readonly sliceMs?: number | undefined;
  readonly yieldTo?: (() => Promise<void>) | undefined;
}

export interface GridEngine<T> {
  count(): number;
  setRows(rows: readonly T[]): void;
  run(query: GridQuery, options?: GridRunOptions): Promise<GridRunResult>;
  visibleIndices(): Uint32Array;
  nodeAt(position: number): GridNode<T> | undefined;
  store(key: string): ColumnStore | undefined;
  dispose(): void;
}
