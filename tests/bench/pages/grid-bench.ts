import type { Locator, Page } from '@playwright/test';

const OPEN_TIMEOUT = 180_000;
const SETTLE_TIMEOUT = 60_000;

export class GridBenchPage {
  readonly grid: Locator;
  readonly viewport: Locator;
  readonly quick: Locator;
  readonly filter: Locator;

  constructor(private readonly page: Page) {
    this.grid = page.getByTestId('bench-grid');
    this.viewport = this.grid.locator('.nui-grid__viewport');
    this.quick = page.getByTestId('bench-quick');
    this.filter = page.locator('.nui-grid-filter');
  }

  async open(rows: number): Promise<void> {
    await this.page.goto(`/bench.html?rows=${rows}`, { timeout: OPEN_TIMEOUT });

    await this.page.waitForFunction(
      () => typeof window.numiorBench?.firstRowMs === 'number',
      undefined,
      { timeout: OPEN_TIMEOUT },
    );
  }

  dataMs(): Promise<number> {
    return this.page.evaluate(() => window.numiorBench?.dataMs ?? Number.NaN);
  }

  coldStart(): Promise<number> {
    return this.page.evaluate(() => window.numiorBench?.firstRowMs ?? Number.NaN);
  }

  remount(): Promise<number> {
    return this.page.evaluate(() => window.numiorBench?.remount() ?? Number.NaN);
  }

  async focusCell(row: number, col: number): Promise<void> {
    await this.viewport
      .locator(`[role="row"][aria-rowindex="${row + 2}"] [aria-colindex="${col + 1}"]`)
      .click();
  }

  async nextFrame(): Promise<void> {
    await this.page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        }),
    );
  }

  async scrollHome(): Promise<void> {
    await this.viewport.evaluate((element) => {
      element.scrollTo({ top: 0, left: 0 });
    });

    await this.nextFrame();
  }

  private header(col: number): Locator {
    return this.viewport.locator(`[role="columnheader"][aria-colindex="${col + 1}"]`);
  }

  private async clearSettles(): Promise<void> {
    await this.page.evaluate(() => {
      window.numiorBench?.settles.splice(0);
    });
  }

  private async waitForSettles(expected: number): Promise<void> {
    await this.page.waitForFunction(
      (count) => (window.numiorBench?.settles.length ?? 0) >= count,
      expected,
      { timeout: SETTLE_TIMEOUT },
    );
  }

  private settles(): Promise<number[]> {
    return this.page.evaluate(() => [...(window.numiorBench?.settles ?? [])]);
  }

  async sortLatencies(col: number, clicks: number, shift = false): Promise<number[]> {
    await this.clearSettles();

    for (let click = 1; click <= clicks; click += 1) {
      await this.header(col).click({ modifiers: shift ? ['Shift'] : [] });
      await this.waitForSettles(click);
    }
    return this.settles();
  }

  private async openFilter(col: number): Promise<void> {
    await this.header(col).hover();
    await this.header(col).locator('.nui-grid__filter').click();
    await this.filter.waitFor();
  }

  async setFilterLatencies(col: number, labels: readonly string[]): Promise<number[]> {
    await this.clearSettles();

    for (const [round, label] of labels.entries()) {
      await this.openFilter(col);
      await this.filter.getByRole('checkbox', { name: label, exact: true }).click();
      await this.filter.getByRole('button', { name: 'Применить' }).click();
      await this.waitForSettles(round + 1);
    }
    return this.settles();
  }

  async resetFilter(col: number): Promise<void> {
    await this.clearSettles();
    await this.openFilter(col);
    await this.filter.getByRole('button', { name: 'Сбросить' }).click();
    await this.waitForSettles(1);
  }

  async groupLatencies(sets: readonly (readonly string[])[]): Promise<number[]> {
    const samples: number[] = [];

    for (const keys of sets) {
      await this.clearSettles();

      await this.page.evaluate((next) => {
        window.numiorBench?.setGroupBy(next);
      }, keys);

      await this.waitForSettles(1);
      samples.push(...(await this.settles()));
    }
    return samples;
  }

  async quickLatencies(text: string, erase: number): Promise<number[]> {
    await this.quick.click();
    await this.clearSettles();
    const keys = [...text, ...Array.from({ length: erase }, () => 'Backspace')];

    for (const [step, key] of keys.entries()) {
      await this.page.keyboard.press(key);
      await this.waitForSettles(step + 1);
    }
    return this.settles();
  }

  async keyLatencies(key: string, times: number): Promise<number[]> {
    await this.page.evaluate(() => {
      window.numiorBench?.latencies.splice(0);
    });

    for (let step = 0; step < times; step += 1) {
      await this.page.keyboard.press(key);
      await this.nextFrame();
    }
    return this.page.evaluate(() => [...(window.numiorBench?.latencies ?? [])]);
  }

  async wheelFrames(steps: number, delta: number): Promise<number[]> {
    const box = await this.viewport.boundingBox();

    if (box === null) {
      throw new Error('The bench grid has no box');
    }
    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    await this.page.evaluate(() => {
      window.numiorBench?.recordFrames(true);
    });

    for (let step = 0; step < steps; step += 1) {
      await this.page.mouse.wheel(0, delta);
      await this.nextFrame();
    }
    return this.page.evaluate(() => {
      window.numiorBench?.recordFrames(false);
      return [...(window.numiorBench?.frames ?? [])];
    });
  }

  async heapMb(): Promise<number> {
    const session = await this.page.context().newCDPSession(this.page);
    await session.send('HeapProfiler.collectGarbage');
    const usage = await session.send('Runtime.getHeapUsage');
    await session.detach();
    return Math.round(usage.usedSize / 1_048_576);
  }
}
