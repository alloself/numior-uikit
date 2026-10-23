import { afterEach, describe, expect, it } from 'vite-plus/test';
import type { ChartSpec } from '../src';
import { ChartDriver } from './drivers/chart';

const mounted: ChartDriver[] = [];

const revenue: ChartSpec = {
  kind: 'column',
  categories: { kind: 'text', labels: ['Q1', 'Q2', 'Q3'] },
  series: [
    { id: 'online', name: 'Online', values: [42, 51.5, null] },
    { id: 'stores', name: 'Stores', values: [1200, 61, 59] },
  ],
  categoryAxis: { title: 'Quarter' },
};

const chartOf = (...args: Parameters<typeof ChartDriver.mount>): ChartDriver => {
  const chart = ChartDriver.mount(...args);

  mounted.push(chart);
  return chart;
};

afterEach(() => {
  for (const chart of mounted.splice(0)) {
    chart.unmount();
  }
  document.documentElement.removeAttribute('dir');
});

describe('NuiChart', () => {
  it('names the figure, draws a mark per value and keeps series in palette order', () => {
    const chart = chartOf({ spec: revenue, label: 'Revenue by quarter' });

    expect(chart.label).toBe('Revenue by quarter');
    expect(chart.drawn).toBe(true);
    expect(chart.barSlots).toEqual([1, 2, 1, 2, 2]);
    expect(chart.categoryTicks).toEqual(['Q1', 'Q2', 'Q3']);
    expect(chart.valueTicks[0]).toBe('0');
  });

  it('draws lines with markers and stacked areas under their lines', async () => {
    const chart = chartOf({ spec: { ...revenue, kind: 'line' } });

    expect(chart.barSlots).toEqual([]);
    expect(chart.strokeSlots).toEqual([1, 2]);
    expect(chart.areaSlots).toEqual([]);
    expect(chart.markerCount).toBe(5);
    await chart.show({ ...revenue, kind: 'area', stacking: 'stacked' });

    expect(chart.areaSlots).toEqual([1, 2]);
    expect(chart.strokeSlots).toEqual([1, 2]);
    expect(chart.markerCount).toBe(6);
  });

  it('cuts pies by category and names the categories in the legend', () => {
    const chart = chartOf({ spec: { ...revenue, kind: 'pie' } });

    expect(chart.sliceSlots).toEqual([1, 2]);
    expect(chart.legend).toEqual(['Q1', 'Q2', 'Q3']);
    expect(chart.valueTicks).toEqual([]);
    expect(chart.tableHeaders).toEqual(['Quarter', 'Online', 'Stores']);
  });

  it('shows a legend only for two series or more', async () => {
    const chart = chartOf({ spec: revenue });

    expect(chart.legend).toEqual(['Online', 'Stores']);
    expect(chart.legendLabel).toBe('Legend');
    await chart.show({ ...revenue, series: revenue.series.slice(0, 1) });

    expect(chart.legend).toEqual([]);
  });

  it('carries every value in a data table that stays hidden unless asked for', async () => {
    const chart = chartOf({ spec: revenue, label: 'Revenue', config: { locale: 'ru-RU' } });

    expect(chart.caption).toBe('Revenue');
    expect(chart.tableHeaders).toEqual(['Quarter', 'Online', 'Stores']);

    expect(chart.tableRows).toEqual([
      ['Q1', '42', '1\u00a0200'],
      ['Q2', '51,5', '61'],
      ['Q3', '—', '59'],
    ]);

    expect(chart.tableShown).toBe(false);
    chart.unmount();
    mounted.splice(0);

    const shown = chartOf({
      spec: { ...revenue, categoryAxis: undefined },
      props: { showTable: true },
    });

    expect(shown.tableShown).toBe(true);
    expect(shown.tableHeaders[0]).toBe('Category');
  });

  it('formats time categories as dates in the table', () => {
    const chart = chartOf({
      spec: {
        kind: 'column',
        categories: { kind: 'time', values: [Date.UTC(2026, 0, 1), Date.UTC(2026, 1, 1)] },
        series: [{ id: 'sales', name: 'Sales', values: [3, 4] }],
      },
      config: { locale: 'en-US' },
    });

    expect(chart.tableRows.map(([date]) => date)).toEqual(['Jan 1, 2026', 'Feb 1, 2026']);
  });

  it('says there is nothing to show when the chart has no series or categories', () => {
    const chart = chartOf({ spec: { ...revenue, series: [] }, config: { locale: 'ru-RU' } });

    expect(chart.drawn).toBe(false);
    expect(chart.empty).toBe('Нет данных для графика');
  });

  it('mirrors the category axis in right-to-left layouts', () => {
    const ltr = chartOf({ spec: revenue });
    const rtl = chartOf({ spec: revenue, config: { dir: 'rtl' } });

    expect(rtl.categoryTickX('Q1')).toBeGreaterThan(rtl.categoryTickX('Q3'));
    expect(ltr.categoryTickX('Q1')).toBeLessThan(ltr.categoryTickX('Q3'));
  });

  it('follows a direction set on the page after mounting', async () => {
    const chart = chartOf({ spec: revenue });

    await chart.setDocumentDirection('rtl');

    expect(chart.categoryTickX('Q1')).toBeGreaterThan(chart.categoryTickX('Q3'));
  });
});
