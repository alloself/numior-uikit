import type { TableFetchRequest, TableFetchResult, TableSource } from '../../src';
import { staff, type Staff } from './staff';

interface RemoteCall {
  readonly request: TableFetchRequest;
  readonly resolve: (result: TableFetchResult<Staff>) => void;
  readonly reject: (error: unknown) => void;
}

const numberOf = (row: Staff, key: string): number =>
  key === 'salary' ? (row.salary ?? 0) : row.id;

export class RemoteStaff {
  readonly rows: Staff[];
  readonly source: TableSource<Staff>;
  private readonly calls: RemoteCall[] = [];

  constructor(count: number, totals?: Readonly<Record<string, unknown>>) {
    this.rows = staff(count);

    this.source = {
      fetch: (request) =>
        new Promise((resolve, reject) => {
          this.calls.push({ request, resolve, reject });
        }),
      totals: totals === undefined ? undefined : () => Promise.resolve(totals),
    };
  }

  get requests(): Array<Pick<TableFetchRequest, 'offset' | 'limit' | 'sort'>> {
    return this.calls.map(({ request }) => ({
      offset: request.offset,
      limit: request.limit,
      sort: request.sort,
    }));
  }

  answer(index = this.calls.length - 1): void {
    const call = this.calls[index];

    if (call === undefined) {
      return;
    }
    const { offset, limit, sort } = call.request;
    const [order] = sort;

    const ordered =
      order === undefined
        ? this.rows
        : this.rows.toSorted(
            (a, b) =>
              (numberOf(a, order.key) - numberOf(b, order.key)) *
              (order.direction === 'asc' ? 1 : -1),
          );

    call.resolve({ rows: ordered.slice(offset, offset + limit), total: this.rows.length });
  }

  fail(index: number, error: unknown): void {
    this.calls[index]?.reject(error);
  }
}
