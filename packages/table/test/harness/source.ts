import { promiseTimeout } from '@vueuse/core';
import {
  createSourceEngine,
  type TableChildrenRequest,
  type TableDistinct,
  type TableEngine,
  type TableFetchRequest,
  type TableFetchResult,
  type TableRowsResult,
  type TableSourceGroup,
  type TableValuesRequest,
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
  readonly tree?: boolean | undefined;
  readonly details?: boolean | undefined;
}

interface PendingChildren {
  readonly request: TableChildrenRequest<Item>;
  readonly resolve: (rows: readonly Item[]) => void;
  readonly reject: (error: unknown) => void;
}

interface PendingFetch {
  readonly request: TableFetchRequest;
  readonly resolve: (result: TableFetchResult<Item>) => void;
  readonly reject: (error: unknown) => void;
}

const GROUPERS: Readonly<Record<string, (id: number) => number>> = {
  team: (id) => id % 3,
  parity: (id) => id % 2,
};

const inPath = (id: number, request: TableFetchRequest): boolean =>
  request.groupPath.every((value, depth) => {
    const key = request.groupBy[depth];

    return key !== undefined && GROUPERS[key]?.(id) === value;
  });

const groupsOf = (ids: readonly number[], key: string): TableSourceGroup[] => {
  const counts = new Map<number, number>();

  for (const id of ids) {
    const value = GROUPERS[key]?.(id) ?? 0;

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts]
    .toSorted((a, b) => a[0] - b[0])
    .map(([value, count]) => ({ value, count, aggregates: { id: count } }));
};

const flush = (): Promise<void> => promiseTimeout(0);

export class SourceHarness {
  readonly engine: TableEngine<Item>;
  readonly errors: unknown[] = [];
  readonly asked: TableValuesRequest[] = [];
  changes = 0;
  size: number;
  private readonly pending: PendingFetch[] = [];
  private readonly branches: PendingChildren[] = [];
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
        children:
          options.tree === true
            ? (request) =>
                new Promise((resolve, reject) => {
                  this.branches.push({ request, resolve, reject });
                })
            : undefined,
        totals: totals === undefined ? undefined : () => Promise.resolve(totals),
        values:
          values === undefined
            ? undefined
            : (request) => {
                this.asked.push(request);
                return Promise.resolve(values);
              },
      },
      keyOf: (item) => item.id,
      hasChildren: (item) => item.id % 10 === 0,
      detail: options.details === true ? (item) => item.id !== 3 : undefined,
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

  get paths(): Array<Pick<TableFetchRequest, 'offset' | 'groupBy' | 'groupPath'>> {
    return this.pending.map(({ request }) => ({
      offset: request.offset,
      groupBy: request.groupBy,
      groupPath: request.groupPath,
    }));
  }

  labels(from: number, to: number): string[] {
    return Array.from({ length: to - from }, (_, offset) => {
      const position = from + offset;
      const node = this.engine.nodeAt(position);

      if (node === undefined) {
        return this.engine.pendingAt(position) ? 'pending' : 'none';
      }
      return node.kind === 'group'
        ? `${node.key}=${String(node.value)} (${node.count})`
        : `${node.kind} ${node.row.id}`;
    });
  }

  get parents(): number[] {
    return this.branches.map(({ request }) => request.row.id);
  }

  async answerChildren(index: number, ids: readonly number[]): Promise<void> {
    this.branches[index]?.resolve(ids.map((id) => ({ id })));
    await flush();
  }

  async failChildren(index: number, error: unknown): Promise<void> {
    this.branches[index]?.reject(error);
    await flush();
  }

  aborted(index: number): boolean {
    return this.pending[index]?.request.signal.aborted ?? false;
  }

  ids(from: number, to: number): Array<number | undefined> {
    return Array.from({ length: to - from }, (_, offset) => this.engine.rowAt(from + offset)?.id);
  }

  async answer(index: number, overrides: Partial<TableRowsResult<Item>> = {}): Promise<void> {
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

  async answerLevel(index: number, shown = this.total ?? 0): Promise<void> {
    const call = this.pending[index];

    if (call !== undefined) {
      const { request } = call;
      const { offset, limit } = request;

      const ids = Array.from({ length: shown }, (_, id) => id).filter((id) => inPath(id, request));

      const key = request.groupBy[request.groupPath.length];

      call.resolve(
        key === undefined
          ? {
              rows: ids.slice(offset, offset + limit).map((id) => ({ id })),
              total: shown === this.total ? ids.length : undefined,
            }
          : { groups: groupsOf(ids, key).slice(offset, offset + limit) },
      );
    }
    await flush();
  }

  async fail(index: number, error: unknown): Promise<void> {
    this.pending[index]?.reject(error);
    await flush();
  }
}
