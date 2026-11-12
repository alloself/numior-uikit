import { afterEach, describe, expect, it } from 'vite-plus/test';
import type { ChartSpec } from '../src';
import { ChartDriver, ChartTheme } from './drivers/chart';

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
  ChartTheme.reset();
});

const MIDDLE = 150;

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

  it('leaves a gap at a missing value or bridges it with a dashed stroke', async () => {
    const visits: ChartSpec = {
      kind: 'line',
      categories: { kind: 'text', labels: ['Mon', 'Tue', 'Wed', 'Thu'] },
      series: [{ id: 'app', name: 'App', values: [4, 6, null, 5] }],
    };

    const chart = chartOf({ spec: visits });

    expect(chart.strokeSlots).toEqual([1]);
    expect(chart.gapSlots).toEqual([]);

    await chart.show({ ...visits, gaps: 'connect' });

    expect(chart.strokeSlots).toEqual([1]);
    expect(chart.gapSlots).toEqual([1]);
    expect(chart.markerCount).toBe(3);
  });

  it('clips the marks that leave a value axis bounded by hand and hides their markers', async () => {
    const chart = chartOf({ spec: { ...revenue, valueAxis: { max: 100 } } });

    expect(chart.clippedMarks).toBe(5);
    expect(chart.valueTicks.at(-1)).toBe('100');

    await chart.show({ ...revenue, kind: 'line', valueAxis: { max: 100 } });
    expect(chart.clippedMarks).toBe(2);
    expect(chart.markerCount).toBe(4);

    await chart.show({ ...revenue, kind: 'line' });
    expect(chart.clippedMarks).toBe(0);
    expect(chart.markerCount).toBe(5);
  });

  it('leaves the legend out on request', () => {
    const chart = chartOf({ spec: revenue, props: { legend: false } });

    expect(chart.legend).toEqual([]);
  });

  it('cuts pies by category and names the categories in the legend', () => {
    const chart = chartOf({ spec: { ...revenue, kind: 'pie' } });

    expect(chart.sliceSlots).toEqual([1, 2]);
    expect(chart.legend).toEqual(['Q1', 'Q2', 'Q3']);
    expect(chart.valueTicks).toEqual([]);
    expect(chart.tableHeaders).toEqual(['Quarter', 'Online', 'Stores']);
  });

  it('shows the values of the category under the pointer and mutes the other columns', async () => {
    const chart = chartOf({ spec: revenue, config: { locale: 'en-US' } });

    expect(chart.tooltip).toBeUndefined();

    await chart.hover(chart.categoryTickX('Q2') + 6, MIDDLE);

    expect(chart.tooltip).toEqual({
      title: 'Q2',
      rows: ['Online 51.5', 'Stores 61'],
      shown: true,
    });

    expect(chart.mutedMarks).toBe(3);

    await chart.leave();

    expect(chart.tooltip?.shown).toBe(false);
    expect(chart.tooltip?.title).toBe('Q2');
    expect(chart.mutedMarks).toBe(0);
  });

  it('follows a crosshair on lines and marks the points it crosses', async () => {
    const chart = chartOf({ spec: { ...revenue, kind: 'line' } });
    const x = chart.categoryTickX('Q3');

    await chart.hover(x - 4, MIDDLE);

    expect(chart.crosshairX).toBeCloseTo(x);
    expect(chart.activePoints).toBe(1);
    expect(chart.tooltip?.rows).toEqual(['Online —', 'Stores 59']);
  });

  it('ends the hover reading on a right click until the pointer moves again', async () => {
    const chart = chartOf({ spec: revenue });
    const x = chart.categoryTickX('Q2') + 6;

    await chart.hover(x, MIDDLE);
    await chart.rightClick();

    expect([chart.tooltip?.shown, chart.mutedMarks]).toEqual([false, 0]);

    await chart.hover(x, MIDDLE);

    expect(chart.tooltip?.shown).toBe(true);
  });

  it('walks categories with the arrow keys, announces them and selects with Enter', async () => {
    const chart = chartOf({ spec: revenue, config: { locale: 'en-US' } });

    expect(chart.focusable).toBe(true);

    await chart.press('ArrowRight');

    expect(chart.announcement).toBe('Q1: Online 42, Stores 1,200');

    await chart.press('End');
    await chart.press('Enter');

    expect(chart.selections).toEqual([{ index: 2, series: undefined }]);
    expect(chart.mutedMarks).toBe(4);

    await chart.press('Escape');

    expect(chart.announcement).toBe('');
    expect(chart.mutedMarks).toBe(4);

    await chart.clickAt(chart.categoryTickX('Q3'), MIDDLE);

    expect(chart.selections).toEqual([{ index: 2, series: undefined }, null]);
    expect(chart.mutedMarks).toBe(0);
  });

  it('describes a slice with its share and walks slices in right-to-left layouts', async () => {
    const chart = chartOf({
      spec: { ...revenue, kind: 'pie' },
      config: { locale: 'en-US', dir: 'rtl' },
    });

    await chart.press('ArrowLeft');
    await chart.press('ArrowLeft');

    expect(chart.announcement).toBe('Q2: Online 51.5 · 55.1%');
    expect(chart.mutedMarks).toBe(1);
  });

  it('shows the pair of a scatter point under the pointer', async () => {
    const chart = chartOf({
      spec: {
        kind: 'scatter',
        categories: { kind: 'number', values: [1, 2] },
        series: [{ id: 'a', name: 'Ratio', values: [3, 4] }],
        categoryAxis: { title: 'Size' },
      },
    });

    await chart.press('ArrowRight');
    await chart.press('ArrowRight');

    expect(chart.tooltip?.title).toBe('Ratio');
    expect(chart.tooltip?.rows).toEqual(['Size 2', 'Y 4']);
    expect(chart.activePoints).toBe(1);
    expect(chart.mutedMarks).toBe(1);
  });

  it('takes the height of its frame and leaves the tab order when asked', async () => {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get(this: HTMLElement) {
        return this.classList.contains('nui-chart__frame') ? 180 : 0;
      },
    });

    const chart = chartOf({ spec: revenue, props: { height: 'fill', focusable: false } });

    await chart.settle();

    Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight');

    expect([chart.fills, chart.sceneHeight, chart.focusable]).toEqual([true, 180, false]);
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

  it('says there is nothing to show when a pie has no positive value to cut', () => {
    const chart = chartOf({
      spec: {
        kind: 'pie',
        categories: { kind: 'text', labels: ['Web', 'Stores', 'Other'] },
        series: [{ id: 'sales', name: 'Sales', values: [0, -4, null] }],
      },
    });

    expect(chart.empty).toBe('No data to show');
    expect(chart.drawn).toBe(false);
    expect(chart.focusable).toBe(false);
  });

  it('mirrors the category axis in right-to-left layouts', () => {
    const ltr = chartOf({ spec: revenue });
    const rtl = chartOf({ spec: revenue, config: { dir: 'rtl' } });

    expect(rtl.categoryTickX('Q1')).toBeGreaterThan(rtl.categoryTickX('Q3'));
    expect(ltr.categoryTickX('Q1')).toBeLessThan(ltr.categoryTickX('Q3'));
  });

  it('hydrates server markup of every kind without mismatches, even on a right-to-left page', async () => {
    const kinds = ['column', 'bar', 'line', 'area', 'pie', 'doughnut'] as const;

    for (const kind of kinds) {
      expect(await ChartDriver.hydrate({ ...revenue, kind }, 'rtl')).toEqual([]);
    }
  });

  it('follows a direction switched in the config after mounting', async () => {
    const chart = chartOf({ spec: revenue, config: { dir: 'ltr' } });
    expect(chart.categoryTickX('Q1')).toBeLessThan(chart.categoryTickX('Q3'));

    await chart.setDirection('rtl');
    expect(chart.categoryTickX('Q1')).toBeGreaterThan(chart.categoryTickX('Q3'));
  });

  it('takes the direction of the page it is mounted on without watching the document', async () => {
    const theme = ChartTheme.install();

    document.documentElement.dir = 'rtl';

    const chart = chartOf({ spec: revenue });

    await chart.settle();
    expect(chart.categoryTickX('Q1')).toBeGreaterThan(chart.categoryTickX('Q3'));
    expect(theme.observed).toEqual([]);
  });

  it('follows a direction set on the page after mounting', async () => {
    const theme = ChartTheme.install();
    const chart = chartOf({ spec: revenue });

    await chart.settle();
    expect(chart.categoryTickX('Q1')).toBeLessThan(chart.categoryTickX('Q3'));

    await theme.setPageDirection('rtl');
    expect(chart.categoryTickX('Q1')).toBeGreaterThan(chart.categoryTickX('Q3'));
    expect(theme.observed).toEqual([]);
  });

  it('lays the labels out with the font size of the theme and follows a theme change', async () => {
    const theme = ChartTheme.install();
    const chart = chartOf({ spec: revenue });

    await chart.settle();

    const tick = chart.categoryTickX('Q1');

    await theme.setFontSize(24);
    expect(chart.categoryTickX('Q1')).toBeGreaterThan(tick);

    const late = chartOf({ spec: revenue });

    await late.settle();
    expect(late.categoryTickX('Q1')).toBe(chart.categoryTickX('Q1'));

    await theme.setFontSize(12);
    expect(chart.categoryTickX('Q1')).toBe(tick);
  });
});
