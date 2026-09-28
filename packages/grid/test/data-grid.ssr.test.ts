// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { NuiDataGrid, type GridSort, type NuiDataGridFilters } from '../src';
import { people, PEOPLE_COLUMNS, type Person } from './support/people';

interface Query {
  readonly sort?: readonly GridSort[];
  readonly filters?: NuiDataGridFilters;
  readonly quick?: string;
}

const render = (count: number, query: Query = {}): Promise<string> =>
  renderToString(
    createSSRApp({
      render: () =>
        h(NuiDataGrid<Person>, {
          columns: PEOPLE_COLUMNS,
          source: people(count),
          id: 'staff',
          sort: query.sort ?? [],
          filters: query.filters ?? [],
          quick: query.quick ?? '',
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

  it('renders the empty state inside the grid when there are no rows', async () => {
    const html = await render(0);

    expect(html).toContain('aria-rowcount="1"');
    expect(html).toContain('No rows to show');
    expect(html).toContain('role="gridcell"');
  });
});
