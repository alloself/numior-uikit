import type { Locator, Page } from '@playwright/test';
import { inkedPixels } from '../helpers/color';
import { boxOf, renderedWidth } from '../helpers/geometry';

export interface ChartTextBox {
  readonly text: string;
  readonly left: number;
  readonly right: number;
}

const exactly = (text: string): RegExp =>
  new RegExp(`^\\s*${text.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);

const PLOT_EDGE = 3;

export class ChartsSection {
  readonly section: Locator;
  readonly columns: Locator;
  readonly bars: Locator;
  readonly lines: Locator;
  readonly areas: Locator;
  readonly pie: Locator;
  readonly doughnut: Locator;
  readonly scatter: Locator;
  readonly deals: Locator;
  readonly bounded: Locator;
  readonly hours: Locator;
  readonly tableSwitch: Locator;
  readonly selectedNote: Locator;
  readonly gapsSwitch: Locator;
  readonly gapNote: Locator;

  constructor(page: Page) {
    this.section = page.locator('section[aria-labelledby="charts-title"]');
    this.columns = page.getByTestId('chart-columns');
    this.bars = page.getByTestId('chart-bars');
    this.lines = page.getByTestId('chart-lines');
    this.areas = page.getByTestId('chart-areas');
    this.pie = page.getByTestId('chart-pie');
    this.doughnut = page.getByTestId('chart-doughnut');
    this.scatter = page.getByTestId('chart-scatter');
    this.deals = page.getByTestId('chart-deals');
    this.bounded = page.getByTestId('chart-bounded');
    this.hours = page.getByTestId('chart-hours');
    this.tableSwitch = page.getByRole('switch', { name: 'Показать таблицу данных' });
    this.selectedNote = page.getByTestId('charts-selected');
    this.gapsSwitch = page.getByRole('switch', { name: 'Соединять пропуски' });
    this.gapNote = page.getByTestId('charts-gap-note');
  }

  tooltip(chart: Locator): Locator {
    return chart.locator('.nui-chart__tooltip--shown');
  }

  announcement(chart: Locator): Locator {
    return chart.locator('.nui-chart__live');
  }

  async categoryPoint(chart: Locator, label: string): Promise<{ x: number; y: number }> {
    const x = await chart
      .locator('.nui-chart__text--category-tick', { hasText: exactly(label) })
      .getAttribute('x');

    const frame = await boxOf(chart.locator('.nui-chart__frame'));

    return { x: Number(x), y: frame.height / 2 };
  }

  async pointAt(chart: Locator, label: string): Promise<void> {
    await chart
      .locator('.nui-chart__frame')
      .hover({ position: await this.categoryPoint(chart, label) });
  }

  async pick(chart: Locator, label: string): Promise<void> {
    await chart
      .locator('.nui-chart__frame')
      .click({ position: await this.categoryPoint(chart, label) });
  }

  marks(chart: Locator): Locator {
    return chart.locator('.nui-chart__bar');
  }

  strokes(chart: Locator): Locator {
    return chart.locator('.nui-chart__stroke:not(.nui-chart__stroke--gap)');
  }

  bridges(chart: Locator): Locator {
    return chart.locator('.nui-chart__stroke--gap');
  }

  async connectGaps(): Promise<void> {
    await this.gapsSwitch.click();
  }

  dashes(chart: Locator): Promise<string[]> {
    return this.bridges(chart).evaluateAll((bridges) =>
      bridges.map((bridge) => getComputedStyle(bridge).strokeDasharray),
    );
  }

  async inkAbovePlot(chart: Locator): Promise<number> {
    const plot = await chart.locator('.nui-chart__line--grid').evaluateAll((lines) => ({
      left: Math.min(...lines.map((line) => Number(line.getAttribute('x1')))),
      right: Math.max(...lines.map((line) => Number(line.getAttribute('x2')))),
      top: Math.min(...lines.map((line) => Number(line.getAttribute('y1')))),
    }));

    return inkedPixels(chart.locator('.nui-chart__svg'), {
      x: plot.left,
      y: 0,
      width: plot.right - plot.left,
      height: plot.top - PLOT_EDGE,
    });
  }

  points(chart: Locator): Locator {
    return chart.locator('.nui-chart__point');
  }

  slices(chart: Locator): Locator {
    return chart.locator('.nui-chart__slice');
  }

  areaFills(chart: Locator): Locator {
    return chart.locator('.nui-chart__area');
  }

  legend(chart: Locator): Locator {
    return chart.getByRole('list');
  }

  table(chart: Locator): Locator {
    return chart.getByRole('table');
  }

  rows(chart: Locator): Locator {
    return this.table(chart).locator('tbody tr');
  }

  async showTable(): Promise<void> {
    await this.tableSwitch.click();
  }

  async tableWidth(chart: Locator): Promise<number> {
    return renderedWidth(chart.locator('.nui-chart__data'));
  }

  colours(chart: Locator): Promise<string[]> {
    return this.marks(chart).evaluateAll((marks) =>
      marks.map((mark) => getComputedStyle(mark).fill),
    );
  }

  ticks(chart: Locator, role: 'value-tick' | 'category-tick'): Promise<ChartTextBox[]> {
    return chart.locator(`.nui-chart__text--${role}`).evaluateAll((texts) =>
      texts.map((text) => {
        const box = text.getBoundingClientRect();

        return { text: text.textContent?.trim() ?? '', left: box.left, right: box.right };
      }),
    );
  }
}
