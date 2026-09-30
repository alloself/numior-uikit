import {
  createSourceEngine,
  type TableDistinct,
  type TableEngine,
  type TableFetchRequest,
  type TableFetchResult,
} from '../../src/engine';

export interface Item {
  readonly id: number;
}

export interface SourceHarnessOptions {
  readonly total?: number | undefined;
  readonly blockSize?: number | undefined;
  readonly cacheBlocks?: number | undefined;
  readonly concurrency?: number | undefined;
  readonly totals?: Readonly<Record<string, unknown>> | undefined;
  readonly values?: TableDistinct | undefined;
}

interface PendingFetch {
  readonly request: TableFetchRequest;
  readonly resolve: (result: TableFetchResult<Item>) => void;
  readonly reject: (error: unknown) => void;
}

const flush = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

export class SourceHarness {
  readonly engine: TableEngine<Item>;
  readonly errors: unknown[] = [];
  changes = 0;
  size: number;
  private readonly pending: PendingFetch[] = [];
  private readonly total: number | undefined;

  constructor(options: SourceHarnessOptions = {}) {
    this.total = options.total;
    this.size = options.blockSize ?? 100;
    const { totals, values } = options;

    this.engine = createSourceEngine<Item>({
      source: {
        fetch: (request) =>
          new Promise((resolve, reject) => {
            this.pending.push({ request, resolve, reject });
          }),
        totals: totals === undefined ? undefined : () => Promise.resolve(totals),
        values: values === undefined ? undefined : () => Promise.resolve(values),
      },
      keyOf: (item) => item.id,
      blockSize: () => this.size,
      cacheBlocks: options.cacheBlocks,
      concurrency: options.concurrency,
      onChange: () => {
        this.changes += 1;
      },
      onError: (error) => {
        this.errors.push(error);
      },
    });
  }

  get requests(): Array<Pick<TableFetchRequest, 'offset' | 'limit' | 'sort'>> {
    return this.pending.map(({ request }) => ({
      offset: request.offset,
      limit: request.limit,
      sort: request.sort,
    }));
  }

  aborted(index: number): boolean {
    return this.pending[index]?.request.signal.aborted ?? false;
  }

  ids(from: number, to: number): Array<number | undefined> {
    return Array.from({ length: to - from }, (_, offset) => this.engine.rowAt(from + offset)?.id);
  }

  async answer(index: number, overrides: Partial<TableFetchResult<Item>> = {}): Promise<void> {
    const call = this.pending[index];

    if (call !== undefined) {
      const { offset, limit } = call.request;

      const available =
        this.total === undefined ? limit : Math.max(0, Math.min(limit, this.total - offset));

      call.resolve({
        rows: Array.from({ length: available }, (_, row) => ({ id: offset + row })),
        total: this.total,
        ...overrides,
      });
    }
    await flush();
  }

  async fail(index: number, error: unknown): Promise<void> {
    this.pending[index]?.reject(error);
    await flush();
  }
}
