import { afterEach, describe, expect, it } from 'vite-plus/test';
import type { ChartSpec } from '../src';
import { ChartDriver, ChartTheme } from './drivers/chart';

const sales: ChartSpec = {
  kind: 'bar',
  categories: { kind: 'text', labels: ['North', 'South'] },
  series: [{ id: 'sales', name: 'Sales', values: [12, 18] }],
};

const regions: ChartSpec = {
  ...sales,
  categories: { kind: 'text', labels: ['East', 'West'] },
};

const mounted: ChartDriver[] = [];

afterEach(() => {
  for (const chart of mounted.splice(0)) {
    chart.unmount();
  }

  ChartTheme.reset();
});

describe('NuiChart and the font of the page', () => {
  it('lays its labels out again once the font of the page arrives', async () => {
    const theme = ChartTheme.install();

    theme.holdPageFont({ fallback: 6, font: 7 });

    const chart = ChartDriver.mount({ spec: sales });

    mounted.push(chart);
    await chart.settle();

    const before = chart.categoryTickX('North');

    await theme.deliverPageFont();

    expect(chart.categoryTickX('North') - before).toBe(5);
  });

  it('keeps the widths it has when the font of the page never arrives', async () => {
    const theme = ChartTheme.install();

    theme.holdPageFont({ fallback: 6, font: 7 });

    const chart = ChartDriver.mount({ spec: regions });

    mounted.push(chart);
    await chart.settle();

    const before = chart.categoryTickX('East');

    await theme.losePageFont();

    expect(chart.categoryTickX('East')).toBe(before);
  });
});
