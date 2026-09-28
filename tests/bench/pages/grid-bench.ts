import type { Locator, Page } from '@playwright/test';

const OPEN_TIMEOUT = 180_000;
const SETTLE_TIMEOUT = 60_000;

export class GridBenchPage {
  readonly grid: Locator;
  readonly viewport: Locator;

  constructor(private readonly page: Page) {
    this.grid = page.getByTestId('bench-grid');
    this.viewport = this.grid.locator('.nui-grid__viewport');
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

  async sortLatencies(col: number, clicks: number, shift = false): Promise<number[]> {
    const header = this.viewport.locator(`[role="columnheader"][aria-colindex="${col + 1}"]`);

    await this.page.evaluate(() => {
      window.numiorBench?.settles.splice(0);
    });

    for (let click = 1; click <= clicks; click += 1) {
      await header.click({ modifiers: shift ? ['Shift'] : [] });

      await this.page.waitForFunction(
        (expected) => (window.numiorBench?.settles.length ?? 0) >= expected,
        click,
        { timeout: SETTLE_TIMEOUT },
      );
    }
    return this.page.evaluate(() => [...(window.numiorBench?.settles ?? [])]);
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
