import { afterEach, describe, expect, it } from 'vite-plus/test';
import { NuiContentTable } from '../../src/table';
import { ContentDriver } from '../drivers/content';
import StarsTable from './fixtures/StarsTable.vue';
import { docOf, everyBlock, node } from '../support/documents';

let driver: ContentDriver | undefined;

const mounted = (...args: Parameters<typeof ContentDriver.mount>): ContentDriver => {
  driver?.destroy();
  driver = ContentDriver.mount(...args);
  return driver;
};

afterEach(() => {
  driver?.destroy();
  driver = undefined;
});

const row = (item: string, sum: number) =>
  node('table_row', [
    node('table_cell', [], { value: item }),
    node('table_cell', [], { value: sum }),
  ]);

const sums = () =>
  docOf(
    node('table', [
      node('table_head', [
        node('table_column', [], { name: 'Item' }),
        node('table_column', [node('table_filter', [], { kind: 'number', min: 2, max: null })], {
          name: 'Sum',
          type: 'number',
          sort: 'desc',
          sortRank: 1,
        }),
      ]),
      node('table_body', [row('a', 1), row('b', 3), row('c', 9)]),
    ]),
  );

describe('NuiContentTable', () => {
  it('draws tables with the table view it is given and keeps the markup table without one', async () => {
    const doc = everyBlock();
    const views = { table: NuiContentTable };
    const view = mounted({ document: doc, views });

    expect(view.staticTables).toBe(0);
    expect(view.tableHeads).toEqual(['Name', 'Sum', 'Paid', 'State']);
    expect(view.tableRows).toEqual(['Ann|12.5||Open|']);
    expect(view.tableChecks).toEqual(['true:true']);
    expect(view.badges).toEqual(['Open']);
    expect(await ContentDriver.ssr({ document: doc, views })).toContain('class="nui-table');
    expect(await ContentDriver.hydrate({ document: doc, views })).toEqual([]);
    expect(mounted({ document: doc }).staticTables).toBe(1);
  });

  it('shows the sort and the filter kept in the document and gives readers no controls over them', async () => {
    const view = mounted({ document: sums(), views: { table: NuiContentTable } });

    expect(view.tableRows).toEqual(['c|9|', 'b|3|']);
    expect(view.tableMenus).toBe(0);

    await view.clickHeader(0);
    expect(view.tableRows).toEqual(['c|9|', 'b|3|']);
  });

  it('draws cells of a type through the view the app registers', async () => {
    const view = mounted({ document: sums(), views: { table: StarsTable } });

    expect(view.tableRows).toEqual(['c|★★★★★★★★★|', 'b|★★★|']);
  });
});
