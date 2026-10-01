// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import {
  NuiTable,
  type TableNodeId,
  type TableSort,
  type NuiTableFilters,
  type NuiTableColumnDef,
} from '../src';
import { FILE_COLUMNS, FILES, type FileNode } from './support/files';
import { people, PEOPLE_COLUMNS, type Person } from './support/people';

interface Query {
  readonly columns?: readonly NuiTableColumnDef<Person>[];
  readonly sort?: readonly TableSort[];
  readonly filters?: NuiTableFilters;
  readonly quick?: string;
  readonly groupBy?: readonly string[];
  readonly expanded?: readonly TableNodeId[];
  readonly auto?: boolean;
  readonly selectable?: 'single' | 'multiple';
  readonly caption?: string;
  readonly striped?: boolean;
  readonly loading?: boolean;
  readonly pagination?: boolean;
  readonly remote?: boolean;
  readonly total?: number;
  readonly pinnedRows?: readonly Person[];
  readonly columnOrder?: readonly string[];
  readonly rowDrag?: boolean;
}

const RENDER_DEFAULTS: Required<Omit<Query, 'auto' | 'selectable' | 'caption' | 'total'>> = {
  columns: PEOPLE_COLUMNS,
  sort: [],
  filters: [],
  quick: '',
  groupBy: [],
  expanded: [],
  striped: false,
  loading: false,
  pagination: false,
  remote: false,
  pinnedRows: [],
  columnOrder: [],
  rowDrag: false,
};

const render = (count: number, query: Query = {}): Promise<string> => {
  const { auto, selectable, caption, ...rest } = { ...RENDER_DEFAULTS, ...query };

  return renderToString(
    createSSRApp({
      render: () =>
        h(NuiTable<Person>, {
          ...rest,
          rows: people(count),
          id: 'staff',
          height: auto === true ? undefined : '28rem',
          selectable,
          caption,
        }),
    }),
  );
};

const renderTree = (): Promise<string> =>
  renderToString(
    createSSRApp({
      render: () =>
        h(NuiTable<FileNode>, {
          columns: FILE_COLUMNS,
          rows: FILES,
          getKey: (row: FileNode) => row.path,
          getChildren: (row: FileNode) => row.items,
          hasChildren: (row: FileNode) => row.lazy === true,
          expanded: ['docs'],
        }),
    }),
  );

describe('NuiTable on the server', () => {
  it('renders the first screen of rows and columns deterministically without a DOM', async () => {
    const html = await render(1000);

    expect(html).toBe(await render(1000));
    expect(html).toContain('role="grid"');
    expect(html).toContain('id="staff"');
    expect(html).toContain('aria-rowcount="1001"');
    expect(html).toContain('aria-colcount="18"');
    expect(html).toContain('aria-rowindex="31"');
    expect(html).not.toContain('aria-rowindex="32"');
    expect(html).toContain('Сотрудник 29');
    expect(html).not.toContain('Сотрудник 30');
    expect(html).toContain('>M6<');
    expect(html).not.toContain('>M7<');
    expect(html).toContain('--_lead:0px');
    expect(html).toContain('--_rest:38800px');
    expect(html).toContain('--_clamp-start:-1240px');
    expect(html).toContain('<table');
    expect(html).toContain('<colgroup>');
    expect(html).toContain('tabindex="0"');
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).not.toContain('undefined');
  });

  it('renders every row in flow without a height and windows nothing', async () => {
    const html = await render(12, { auto: true });

    expect(html).toBe(await render(12, { auto: true }));
    expect(html).toContain('nui-table--auto');
    expect(html).not.toContain('--_rest');
    expect(html).not.toContain('--_clamp-start');
    expect(html).not.toContain('block-size');
    expect(html).toContain('aria-rowcount="13"');
    expect(html).toContain('aria-rowindex="13"');
    expect(html).toContain('Сотрудник 11');
  });

  it('renders the drag grips of draggable rows on the server', async () => {
    const html = await render(3, { auto: true, rowDrag: true });

    expect(html).toBe(await render(3, { auto: true, rowDrag: true }));
    expect(html).toContain('aria-colcount="18"');
    expect(html.match(/nui-table__row-grip/g)).toHaveLength(3);
    expect(html).toContain('aria-label="Drag row Сотрудник 0"');
  });

  it('orders the columns by the column order model on the server', async () => {
    const html = await render(3, { auto: true, columnOrder: ['city', 'name'] });

    expect(html).toBe(await render(3, { auto: true, columnOrder: ['city', 'name'] }));
    expect(html.indexOf('>Город<')).toBeLessThan(html.indexOf('>Имя<'));
    expect(html.indexOf('>ID<')).toBeLessThan(html.indexOf('>Город<'));
    expect(html).toContain('nui-table__grip');
  });

  it('renders selection controls, a caption, stripes and skeletons deterministically', async () => {
    const query = { auto: true, selectable: 'multiple', caption: 'Staff', striped: true } as const;
    const html = await render(6, query);

    expect(html).toBe(await render(6, query));
    expect(html).toContain('aria-multiselectable="true"');
    expect(html).toContain('aria-labelledby="staff-caption"');
    expect(html).toContain('id="staff-caption"');
    expect(html).not.toContain('aria-label="Data grid"');
    expect(html).toContain('aria-colcount="19"');
    expect(html).toContain('aria-label="Select all rows"');
    expect(html.match(/aria-label="Select row"/g)).toHaveLength(6);
    expect(html.match(/aria-selected="false"/g)).toHaveLength(6);
    expect(html.match(/nui-table__row--odd/g)).toHaveLength(3);
    expect(html).not.toContain('nui-table__row--selected');

    const loading = await render(6, { auto: true, loading: true });

    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain('aria-rowcount="1"');
    expect(loading.match(/nui-table__row--skeleton/g)).toHaveLength(5);
    expect(loading).not.toContain('Сотрудник 0');
  });

  it('renders the first page and the pagination footer on the server', async () => {
    const html = await render(45, { auto: true, pagination: true });

    expect(html).toBe(await render(45, { auto: true, pagination: true }));
    expect(html).toContain('aria-rowcount="21"');
    expect(html).toContain('Сотрудник 19');
    expect(html).not.toContain('Сотрудник 20');
    expect(html).toContain('nui-table__pagination');
    expect(html).toContain('nui-pagination');

    const remote = await render(5, { auto: true, pagination: true, remote: true, total: 500 });

    expect(remote).toContain('aria-rowcount="6"');
    expect(remote).toContain('Сотрудник 4');

    const pinned = await render(5, { auto: true, pinnedRows: people(102).slice(100) });

    expect(pinned).toBe(await render(5, { auto: true, pinnedRows: people(102).slice(100) }));
    expect(pinned).toContain('aria-rowcount="8"');
    expect(pinned.match(/nui-table__row--pinned/g)).toHaveLength(2);
    expect(pinned.indexOf('Сотрудник 100')).toBeLessThan(pinned.indexOf('Сотрудник 0<'));
  });

  it('orders the first screen by the initial sort on the server', async () => {
    const sort = [{ key: 'salary', direction: 'desc' }] as const;
    const html = await render(1000, { sort });

    expect(html).toBe(await render(1000, { sort }));
    expect(html).toContain('aria-sort="descending"');
    expect(html.indexOf('Сотрудник 998')).toBeLessThan(html.indexOf('Сотрудник 997'));
    expect(html).not.toContain('Сотрудник 0<');
  });

  it('filters the first screen by the initial column and quick filters and marks the column', async () => {
    const query = {
      filters: [{ kind: 'set', key: 'remote', values: [true] }],
      quick: 'Казань',
    } as const;

    const html = await render(1000, query);

    expect(html).toBe(await render(1000, query));
    expect(html).toContain('aria-rowcount="84"');
    expect(html).toContain('Сотрудник 9<');
    expect(html).not.toContain('Сотрудник 1<');
    expect(html.match(/nui-table__filter--active/g)).toHaveLength(1);
    expect(html).not.toContain('role="dialog"');
  });

  it('renders groups with levels and the totals row on the server', async () => {
    const query = {
      columns: PEOPLE_COLUMNS.map((column) =>
        column.key === 'id' ? { ...column, aggregate: 'count' as const } : column,
      ),
      groupBy: ['team'],
      expanded: ['["Данные"]'],
    };

    const html = await render(1000, query);

    expect(html).toBe(await render(1000, query));
    expect(html).toContain('role="treegrid"');
    expect(html).toContain('aria-rowcount="338"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-level="2"');
    expect(html).toContain('(333)');
    expect(html).toContain('>Total<');
  });

  it('renders column group bands above the headers and offsets the rows', async () => {
    const [id, name, city, ...rest] = PEOPLE_COLUMNS;

    const query = {
      columns: [
        ...(id === undefined ? [] : [id]),
        {
          key: 'person',
          label: 'Сотрудник',
          children: [name, city].flatMap((column) => (column === undefined ? [] : [column])),
        },
        ...rest,
      ],
    };

    const html = await render(1000, query);

    expect(html).toBe(await render(1000, query));
    expect(html).toContain('aria-rowcount="1002"');
    expect(html).toContain('aria-colspan="2"');
    expect(html).toContain('>Сотрудник<');
    expect(html).toContain('aria-rowindex="3"');
    expect(html).not.toContain('aria-rowindex="33"');
  });

  it('renders expanded tree rows with levels and indentation on the server', async () => {
    const html = await renderTree();

    expect(html).toBe(await renderTree());
    expect(html).toContain('role="treegrid"');
    expect(html).toContain('aria-rowcount="7"');
    expect(html).toContain('aria-level="2"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('--_level:1');
    expect(html).toContain('>plan.md<');
  });

  it('renders skeleton rows for a source without asking it for rows on the server', async () => {
    const offsets: number[] = [];

    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(NuiTable<Person>, {
            columns: PEOPLE_COLUMNS,
            id: 'staff',
            height: '400px',
            source: {
              fetch: (request) => {
                offsets.push(request.offset);
                return Promise.resolve({ rows: [], total: 0 });
              },
            },
          }),
      }),
    );

    expect(html.match(/nui-table__row--skeleton/g)).toHaveLength(5);
    expect(html).toContain('aria-busy="true"');
    expect(offsets).toEqual([]);
  });

  it('renders the empty state inside the grid when there are no rows', async () => {
    const html = await render(0);

    expect(html).toContain('aria-rowcount="1"');
    expect(html).toContain('No rows to show');
    expect(html).toContain('role="gridcell"');
  });
});
