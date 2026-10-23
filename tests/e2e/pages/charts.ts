import type { Locator, Page } from '@playwright/test';

export interface ChartTextBox {
  readonly text: string;
  readonly left: number;
  readonly right: number;
}

export class ChartsSection {
  readonly section: Locator;
  readonly columns: Locator;
  readonly bars: Locator;
  readonly tableSwitch: Locator;

  constructor(page: Page) {
    this.section = page.locator('section[aria-labelledby="charts-title"]');
    this.columns = page.getByTestId('chart-columns');
    this.bars = page.getByTestId('chart-bars');
    this.tableSwitch = page.getByRole('switch', { name: 'Показать таблицу данных' });
  }

  marks(chart: Locator): Locator {
    return chart.locator('.nui-chart__bar');
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
    return (await chart.locator('.nui-chart__data').boundingBox())?.width ?? 0;
  }

  fills(chart: Locator): Promise<string[]> {
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
