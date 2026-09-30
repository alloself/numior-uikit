import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { RemoteStaff } from './support/remote';
import { STAFF_COLUMNS, type Staff } from './support/staff';

const mounted: TableDriver<Staff>[] = [];

const mountRemote = (
  remote: RemoteStaff,
  options: Partial<TableMountOptions<Staff>> = {},
): TableDriver<Staff> => {
  const grid = TableDriver.mount<Staff>({
    columns: STAFF_COLUMNS,
    rows: [],
    config: { locale: 'ru-RU' },
    width: 1200,
    ...options,
    props: { source: remote.source, ...options.props },
  });

  mounted.push(grid);
  return grid;
};

afterEach(() => {
  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
});

describe('NuiTable with a source', () => {
  it('shows skeleton rows until the first block arrives and loads blocks while scrolling', async () => {
    const remote = new RemoteStaff(1000);
    const grid = mountRemote(remote, { props: { blockSize: 50 } });

    await grid.settle();
    expect(grid.skeletonRows).toBe(6);
    expect(grid.cellText(0, 0)).toBe('Итого');
    expect(remote.requests).toEqual([{ offset: 0, limit: 50, sort: [] }]);
    remote.answer();
    await flushPromises();
    expect(grid.skeletonRows).toBe(0);
    expect(grid.cellText(0, 1)).toBe('Сотрудник 0');
    expect(grid.rowCount).toBe(1002);
    await grid.scroll({ top: 40 * 600 });
    expect(remote.requests.at(-1)?.offset).toBe(550);
    expect(grid.pendingRows).toBeGreaterThan(0);
    remote.answer();
    await flushPromises();
    expect(grid.cellText(600, 1)).toBe('Сотрудник 600');
    expect(grid.pendingRows).toBe(0);
  });

  it('asks the source again on sorting and keeps the row count under skeleton cells', async () => {
    const remote = new RemoteStaff(1000);
    const grid = mountRemote(remote);

    await grid.settle();
    remote.answer();
    await flushPromises();
    await grid.clickHeader(3);
    await grid.clickHeader(3);

    expect(remote.requests.at(-1)).toEqual({
      offset: 0,
      limit: 100,
      sort: [{ key: 'salary', direction: 'desc' }],
    });

    expect(grid.pendingRows).toBeGreaterThan(0);
    expect(grid.rowCount).toBe(1002);
    remote.answer();
    await flushPromises();
    expect(grid.cellText(0, 3)).toBe('10 990');
  });

  it('pages through the source with one request per page when the table has no height', async () => {
    const remote = new RemoteStaff(45);
    const grid = mountRemote(remote, { auto: true });

    await grid.settle();
    expect(grid.paginated).toBe(true);
    expect(remote.requests).toEqual([{ offset: 0, limit: 20, sort: [] }]);
    remote.answer();
    await flushPromises();
    expect(grid.rangeText).toBe('1–20 из 45');
    await grid.nextPage();
    expect(remote.requests.at(-1)).toEqual({ offset: 20, limit: 20, sort: [] });
    remote.answer();
    await flushPromises();
    expect(grid.cellText(0, 1)).toBe('Сотрудник 20');
  });

  it('reports a failed request, keeps the skeletons and loads again on refresh', async () => {
    const remote = new RemoteStaff(30);
    const grid = mountRemote(remote);

    await grid.settle();
    remote.fail(0, new Error('offline'));
    await flushPromises();
    expect(grid.errors).toEqual([new Error('offline')]);
    expect(grid.announcement).toBe('Не удалось загрузить строки');
    expect(grid.skeletonRows).toBe(6);
    await grid.refresh();
    expect(remote.requests).toHaveLength(2);
    remote.answer();
    await flushPromises();
    expect(grid.skeletonRows).toBe(0);
    expect(grid.cellText(2, 1)).toBe('Сотрудник 2');
  });

  it('fills the totals row from the source once the table asks for rows', async () => {
    const remote = new RemoteStaff(30, { salary: 12_345 });
    const grid = mountRemote(remote);

    await grid.settle();
    remote.answer();
    await flushPromises();
    expect(grid.cellText(30, 3)).toBe('12\u00a0345');
  });

  it('exports every row of the source rather than the loaded blocks', async () => {
    const remote = new RemoteStaff(30);
    const grid = mountRemote(remote, { props: { blockSize: 10 } });

    await grid.settle();
    remote.answer();
    await flushPromises();

    const text = grid.exportCsv({ headers: false });

    await flushPromises();
    expect(remote.requests.at(-1)).toEqual({ offset: 0, limit: 1000, sort: [] });
    remote.answer();
    expect((await text).split('\r\n')).toHaveLength(30);
  });
});
