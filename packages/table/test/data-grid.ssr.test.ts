// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import {
  NuiDataGrid,
  type GridNodeId,
  type GridSort,
  type NuiDataGridFilters,
  type NuiGridColumnDef,
} from '../src';
import { FILE_COLUMNS, FILES, type FileNode } from './support/files';
import { people, PEOPLE_COLUMNS, type Person } from './support/people';

interface Query {
  readonly columns?: readonly NuiGridColumnDef<Person>[];
  readonly sort?: readonly GridSort[];
  readonly filters?: NuiDataGridFilters;
  readonly quick?: string;
  readonly groupBy?: readonly string[];
  readonly expanded?: readonly GridNodeId[];
}

const render = (count: number, query: Query = {}): Promise<string> =>
  renderToString(
    createSSRApp({
      render: () =>
        h(NuiDataGrid<Person>, {
          columns: query.columns ?? PEOPLE_COLUMNS,
          source: people(count),
          id: 'staff',
          sort: query.sort ?? [],
          filters: query.filters ?? [],
          quick: query.quick ?? '',
          groupBy: query.groupBy ?? [],
          expanded: query.expanded ?? [],
        }),
    }),
  );

const renderTree = (): Promise<string> =>
  renderToString(
    createSSRApp({
      render: () =>
        h(NuiDataGrid<FileNode>, {
          columns: FILE_COLUMNS,
          source: FILES,
          getKey: (row: FileNode) => row.path,
          getChildren: (row: FileNode) => row.items,
          hasChildren: (row: FileNode) => row.lazy === true,
          expanded: ['docs'],
        }),
    }),
  );

describe('NuiDataGrid on the server', () => {
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
    expect(html).toContain('translateY(1160px)');
    expect(html).toContain('tabindex="0"');
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).not.toContain('undefined');
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
    expect(html.match(/nui-grid__filter--active/g)).toHaveLength(1);
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

  it('renders the empty state inside the grid when there are no rows', async () => {
    const html = await render(0);

    expect(html).toContain('aria-rowcount="1"');
    expect(html).toContain('No rows to show');
    expect(html).toContain('role="gridcell"');
  });
});
