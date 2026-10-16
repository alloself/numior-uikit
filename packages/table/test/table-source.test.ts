import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vite-plus/test';
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

  it('groups server rows by a column and loads the rows of a group when it opens', async () => {
    const remote = new RemoteStaff(90);
    const grid = mountRemote(remote, { groupBy: ['city'] });

    await grid.settle();
    expect(remote.paths).toEqual([{ groupBy: ['city'], groupPath: [] }]);
    remote.answer();
    await flushPromises();
    expect(grid.role).toBe('treegrid');
    expect(grid.rowCount).toBe(5);
    expect(grid.groupLabel(0)).toBe('Ереван (30)');
    expect(grid.groupLabel(2)).toBe('Москва (30)');
    expect(grid.rowExpanded(1)).toBe('false');
    expect(grid.cellText(0, 3)).toBe('43\u00a0650');
    expect(grid.cellText(3, 0)).toBe('Итого90 строк');
    await grid.toggleGroup(1);
    expect(grid.rowExpanded(1)).toBe('true');
    expect(grid.rowCount).toBe(35);
    expect(grid.pendingRows).toBeGreaterThan(0);
    expect(remote.paths.at(-1)).toEqual({ groupBy: ['city'], groupPath: ['Казань'] });
    remote.answer();
    await flushPromises();
    expect(grid.pendingRows).toBe(0);
    expect(grid.cellText(2, 1)).toBe('Сотрудник 1');
    expect(grid.rowLevel(2)).toBe('2');
    await grid.toggleGroup(1);
    expect(grid.rowCount).toBe(5);
    expect(grid.groupLabel(2)).toBe('Москва (30)');
  });

  it('groups a source from the column menu and asks it again for flat rows without the group', async () => {
    const remote = new RemoteStaff(90);
    const grid = mountRemote(remote);

    await grid.settle();
    remote.answer();
    await flushPromises();
    await grid.openColumnMenu(2);
    await grid.chooseMenu('Группировать по колонке');
    expect(remote.paths.at(-1)).toEqual({ groupBy: ['city'], groupPath: [] });
    remote.answer();
    await flushPromises();
    expect(grid.groupLabel(1)).toBe('Казань (30)');
    await grid.openColumnMenu(2);
    await grid.chooseMenu('Убрать из группировки');
    expect(remote.paths.at(-1)).toEqual({ groupBy: [], groupPath: [] });
    remote.answer();
    await flushPromises();
    expect(grid.role).toBe('grid');
    expect(grid.cellText(0, 1)).toBe('Сотрудник 0');
  });

  it('loads the children of a server row when it opens and shows them one level deeper', async () => {
    const remote = new RemoteStaff(30, undefined, true);

    const grid = mountRemote(remote, {
      props: { getKey: (row) => row.id, hasChildren: (row) => row.id % 10 === 0 },
    });

    await grid.settle();
    remote.answer();
    await flushPromises();
    expect(grid.role).toBe('treegrid');
    expect(grid.rowLevel(0)).toBe('1');
    expect(grid.rowExpanded(0)).toBe('false');
    expect(grid.rowExpanded(1)).toBeUndefined();
    await grid.toggleRow(0);
    expect(grid.expanded).toEqual([0]);
    expect(remote.parents).toEqual([0]);
    expect(grid.rowBusy(0)).toBe(true);
    expect(grid.rowCount).toBe(33);
    remote.answerChildren();
    await flushPromises();
    expect(grid.rowBusy(0)).toBe(false);
    expect(grid.rowCount).toBe(34);
    expect(grid.cellText(1, 1)).toBe('Сотрудник 1001');
    expect(grid.rowLevel(1)).toBe('2');
    expect(grid.loads).toEqual([]);
    await grid.toggleRow(0);
    expect(grid.rowCount).toBe(32);
    expect(grid.cellText(1, 1)).toBe('Сотрудник 1');
  });
});
