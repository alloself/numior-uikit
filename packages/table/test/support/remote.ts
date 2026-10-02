import type { TableFetchRequest, TableFetchResult, TableSource, TableSourceGroup } from '../../src';
import { staff, type Staff } from './staff';

interface RemoteCall {
  readonly request: TableFetchRequest;
  readonly resolve: (result: TableFetchResult<Staff>) => void;
  readonly reject: (error: unknown) => void;
}

const numberOf = (row: Staff, key: string): number =>
  key === 'salary' ? (row.salary ?? 0) : row.id;

const groupValueOf = (row: Staff, key: string | undefined): unknown =>
  key === 'remote' ? row.remote : row.city;

const insidePath = (row: Staff, request: TableFetchRequest): boolean =>
  request.groupPath.every((value, depth) => groupValueOf(row, request.groupBy[depth]) === value);

const groupsOf = (rows: readonly Staff[], key: string): TableSourceGroup[] => {
  const groups = new Map<unknown, Staff[]>();

  for (const row of rows) {
    const value = groupValueOf(row, key);

    groups.set(value, [...(groups.get(value) ?? []), row]);
  }
  return [...groups]
    .toSorted((a, b) => String(a[0]).localeCompare(String(b[0]), 'ru'))
    .map(([value, members]) => ({
      value,
      count: members.length,
      aggregates: { salary: members.reduce((sum, row) => sum + (row.salary ?? 0), 0) },
    }));
};

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

  get paths(): Array<Pick<TableFetchRequest, 'groupBy' | 'groupPath'>> {
    return this.calls.map(({ request }) => ({
      groupBy: request.groupBy,
      groupPath: request.groupPath,
    }));
  }

  answer(index = this.calls.length - 1): void {
    const call = this.calls[index];

    if (call === undefined) {
      return;
    }
    const { offset, limit, sort, groupBy, groupPath } = call.request;
    const [order] = sort;
    const inside = this.rows.filter((row) => insidePath(row, call.request));
    const level = groupBy[groupPath.length];

    if (level !== undefined) {
      call.resolve({ groups: groupsOf(inside, level).slice(offset, offset + limit) });
      return;
    }

    const ordered =
      order === undefined
        ? inside
        : inside.toSorted(
            (a, b) =>
              (numberOf(a, order.key) - numberOf(b, order.key)) *
              (order.direction === 'asc' ? 1 : -1),
          );

    call.resolve({ rows: ordered.slice(offset, offset + limit), total: inside.length });
  }

  fail(index: number, error: unknown): void {
    this.calls[index]?.reject(error);
  }
}
